import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import {
  ObjectiveCategory,
  ObjectiveStatus,
  ObjectivePriority,
  QualityObjective,
  RiskLevel,
} from './entities/quality-objective.entity';
import {
  BadgeCode,
  ObjectiveBadge,
} from './entities/objective-badge.entity';
import { ObjectiveHistory } from './entities/objective-history.entity';
import {
  ObjectiveMetricsService,
  ObjectiveSeriesPoint,
} from './objective.metrics.service';
import {
  ObjectivePredictionService,
  PredictionResult,
} from './objective.prediction.service';
import { CreateQualityObjectiveDto } from './dto/create-quality-objective.dto';
import { UpdateQualityObjectiveDto } from './dto/update-quality-objective.dto';

const RISK_ORDER: Record<RiskLevel, number> = {
  [RiskLevel.LOW]: 0,
  [RiskLevel.MEDIUM]: 1,
  [RiskLevel.HIGH]: 2,
  [RiskLevel.CRITICAL]: 3,
};

const CATEGORY_LABELS: Record<ObjectiveCategory, string> = {
  [ObjectiveCategory.COMPLIANCE]: 'conformite',
  [ObjectiveCategory.CRITICAL_INCIDENTS]: 'incidents critiques',
  [ObjectiveCategory.DOWNTIME]: 'arrets',
  [ObjectiveCategory.RESOLUTION_TIME]: 'temps de resolution',
  [ObjectiveCategory.INSPECTIONS]: 'inspections',
  [ObjectiveCategory.PRODUCTIVITY]: 'productivite',
  [ObjectiveCategory.PHOTOS]: 'photos attachees',
  [ObjectiveCategory.TRAINING]: 'formation',
  [ObjectiveCategory.CUSTOM]: 'objectif personnalise',
};

const MS_PER_DAY = 86400000;

@Injectable()
export class QualityObjectivesService {
  private readonly logger = new Logger(QualityObjectivesService.name);

  constructor(
    @InjectRepository(QualityObjective)
    private readonly objectiveRepo: Repository<QualityObjective>,
    @InjectRepository(ObjectiveBadge)
    private readonly badgeRepo: Repository<ObjectiveBadge>,
    @InjectRepository(ObjectiveHistory)
    private readonly historyRepo: Repository<ObjectiveHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    private readonly metricsService: ObjectiveMetricsService,
    private readonly predictionService: ObjectivePredictionService,
    private readonly notificationService: NotificationService,
  ) {}

  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------

  async create(user: User, dto: CreateQualityObjectiveDto): Promise<QualityObjective> {
    const start = this.parseDate(dto.startDate);
    const end = this.parseDate(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('La date de fin doit etre posterieure a la date de debut');
    }

    const ownerId =
      user.role === UserRole.SUPER_ADMIN && dto.superviseurId ? dto.superviseurId : user.id;
    const owner = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Superviseur introuvable');
    }

    const category = dto.category;
    const higherIsBetter =
      dto.higherIsBetter !== undefined
        ? dto.higherIsBetter
        : this.metricsService.isHigherBetter(category);

    const objective = this.objectiveRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      category,
      targetValue: dto.targetValue,
      currentValue: category === ObjectiveCategory.CUSTOM ? (dto.currentValue ?? 0) : 0,
      unit: dto.unit && dto.unit.length > 0 ? dto.unit : this.metricsService.getDefaultUnit(category),
      higherIsBetter,
      priority: dto.priority ?? ObjectivePriority.MEDIUM,
      startDate: dto.startDate,
      endDate: dto.endDate,
      progress: 0,
      status: ObjectiveStatus.ACTIVE,
      riskLevel: RiskLevel.LOW,
      lastRiskLevel: RiskLevel.LOW,
      recommendation: null,
      createdBy: { id: owner.id } as User,
    });
    const saved = await this.objectiveRepo.save(objective);
    await this.recompute(saved);
    return (await this.objectiveRepo.findOne({ where: { id: saved.id } }))!;
  }

  async findAll(
    user: User,
    status?: ObjectiveStatus,
    category?: ObjectiveCategory,
    superviseurId?: string,
  ): Promise<QualityObjective[]> {
    const scope = this.resolveScope(user, superviseurId);
    const where: any = {};
    if (scope) where.createdBy = { id: scope };
    if (status) where.status = status;
    if (category) where.category = category;

    const objectives = await this.objectiveRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (scope) {
      await Promise.all(
        objectives
          .filter((o) => o.status === ObjectiveStatus.ACTIVE || o.status === ObjectiveStatus.AT_RISK)
          .map((o) => this.recompute(o)),
      );
    }
    return this.objectiveRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(user: User, id: string): Promise<QualityObjective> {
    const objective = await this.objectiveRepo.findOne({ where: { id } });
    if (!objective) throw new NotFoundException('Objectif introuvable');
    this.assertVisible(user, objective);
    if (objective.status === ObjectiveStatus.ACTIVE || objective.status === ObjectiveStatus.AT_RISK) {
      const scope = this.scopeFor(user, objective);
      if (scope) await this.recompute(objective);
    }
    return (await this.objectiveRepo.findOne({ where: { id } }))!;
  }

  async update(
    user: User,
    id: string,
    dto: UpdateQualityObjectiveDto,
  ): Promise<QualityObjective> {
    const objective = await this.objectiveRepo.findOne({ where: { id } });
    if (!objective) throw new NotFoundException('Objectif introuvable');
    this.assertManageable(user, objective);

    if (dto.startDate && dto.endDate) {
      const start = this.parseDate(dto.startDate);
      const end = this.parseDate(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('La date de fin doit etre posterieure a la date de debut');
      }
    }
    if (dto.endDate) {
      const start = this.parseDate(dto.startDate ?? objective.startDate);
      const end = this.parseDate(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('La date de fin doit etre posterieure a la date de debut');
      }
    }

    Object.assign(objective, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.targetValue !== undefined ? { targetValue: dto.targetValue } : {}),
      ...(dto.unit !== undefined && dto.unit.length > 0 ? { unit: dto.unit } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
      ...(dto.higherIsBetter !== undefined ? { higherIsBetter: dto.higherIsBetter } : {}),
      ...(dto.currentValue !== undefined && objective.category === ObjectiveCategory.CUSTOM
        ? { currentValue: dto.currentValue }
        : {}),
    });

    const saved = await this.objectiveRepo.save(objective);
    await this.recompute(saved);
    return (await this.objectiveRepo.findOne({ where: { id: saved.id } }))!;
  }

  async remove(user: User, id: string): Promise<{ message: string }> {
    const objective = await this.objectiveRepo.findOne({ where: { id } });
    if (!objective) throw new NotFoundException('Objectif introuvable');
    this.assertManageable(user, objective);
    await this.historyRepo.delete({ objective: { id } });
    await this.objectiveRepo.delete(id);
    return { message: 'Objectif supprime avec succes' };
  }

  // ------------------------------------------------------------------
  // Dashboard / predictions / history / badges
  // ------------------------------------------------------------------

  async getDashboard(user: User, superviseurId?: string) {
    const scope = this.resolveScope(user, superviseurId);
    const where: any = scope ? { createdBy: { id: scope } } : {};
    const objectives = await this.objectiveRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    for (const o of objectives) {
      if (o.status === ObjectiveStatus.ACTIVE || o.status === ObjectiveStatus.AT_RISK) {
        await this.recompute(o);
      }
    }
    const refreshed = await this.objectiveRepo.find({ where, order: { createdAt: 'DESC' } });

    const active = refreshed.filter((o) => o.status === ObjectiveStatus.ACTIVE);
    const atRisk = refreshed.filter((o) => o.status === ObjectiveStatus.AT_RISK);
    const completed = refreshed.filter((o) => o.status === ObjectiveStatus.COMPLETED);
    const failed = refreshed.filter((o) => o.status === ObjectiveStatus.FAILED);
    const withProb = refreshed.filter((o) => o.predictionProbability !== null);
    const avgProbability = withProb.length
      ? Math.round(
          (withProb.reduce((s, o) => s + (o.predictionProbability ?? 0), 0) / withProb.length) * 10,
        ) / 10
      : 0;

    const riskDistribution = {
      low: refreshed.filter((o) => o.riskLevel === RiskLevel.LOW).length,
      medium: refreshed.filter((o) => o.riskLevel === RiskLevel.MEDIUM).length,
      high: refreshed.filter((o) => o.riskLevel === RiskLevel.HIGH).length,
      critical: refreshed.filter((o) => o.riskLevel === RiskLevel.CRITICAL).length,
    };

    const badges = await this.getBadges(user, scope);
    const monthlyEvolution = await this.buildMonthlyEvolution(scope);

    return {
      kpis: {
        total: refreshed.length,
        active: active.length,
        atRisk: atRisk.length,
        completed: completed.length,
        failed: failed.length,
        avgProbability,
      },
      objectives: refreshed,
      monthlyEvolution,
      riskDistribution,
      badges,
    };
  }

  async getPredictions(user: User, superviseurId?: string) {
    const scope = this.resolveScope(user, superviseurId);
    const objectives = await this.objectiveRepo.find({
      where: scope ? { createdBy: { id: scope } } : {},
    });

    for (const o of objectives) {
      if (o.status === ObjectiveStatus.ACTIVE || o.status === ObjectiveStatus.AT_RISK) {
        await this.recompute(o);
      }
    }
    const refreshed = await this.objectiveRepo.find({
      where: scope ? { createdBy: { id: scope } } : {},
    });

    return refreshed
      .map((o) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        currentValue: o.currentValue,
        targetValue: o.targetValue,
        unit: o.unit,
        progress: o.progress,
        status: o.status,
        priority: o.priority,
        predictedValue: o.predictedValue,
        predictionProbability: o.predictionProbability,
        riskLevel: o.riskLevel,
        daysRemaining: this.daysRemaining(o.endDate),
        endDate: o.endDate,
      }))
      .sort(
        (a, b) =>
          (a.predictionProbability ?? 100) - (b.predictionProbability ?? 100),
      );
  }

  async getHistory(user: User, objectiveId?: string) {
    if (objectiveId) {
      const objective = await this.objectiveRepo.findOne({ where: { id: objectiveId } });
      if (!objective) throw new NotFoundException('Objectif introuvable');
      this.assertVisible(user, objective);
      const rows = await this.historyRepo.find({
        where: { objective: { id: objectiveId } },
        order: { recordedAt: 'ASC' },
        take: 120,
      });
      return rows.map((r) => ({
        id: r.id,
        objectiveId: r.objective.id,
        value: r.value,
        progress: r.progress,
        probability: r.probability,
        recordedAt: r.recordedAt,
      }));
    }

    const scope = this.resolveScope(user);
    const rows = await this.historyRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.objective', 'o')
      .where(scope ? 'o.created_by = :scope' : '1=1', scope ? { scope } : {})
      .orderBy('h.recorded_at', 'DESC')
      .take(200)
      .getMany();
    return rows.map((r) => ({
      id: r.id,
      objectiveId: r.objective.id,
      value: r.value,
      progress: r.progress,
      probability: r.probability,
      recordedAt: r.recordedAt,
    }));
  }

  async getBadges(user: User, scopeOverride?: string | null): Promise<ObjectiveBadge[]> {
    const scope = scopeOverride ?? this.resolveScope(user);
    if (!scope) return [];
    const badges = await this.badgeRepo.find({
      where: { user: { id: scope } },
      order: { unlockedAt: 'ASC' },
    });
    return badges;
  }

  // ------------------------------------------------------------------
  // Recalcul complet d'un objectif
  // ------------------------------------------------------------------

  private async recompute(objective: QualityObjective): Promise<void> {
    const scope = objective.createdBy?.id;
    if (!scope) return;

    const series = await this.metricsService.buildDailySeries(objective, scope);
    const metric = await this.metricsService.computeCurrentValue(objective, scope);

    const start = this.parseDate(objective.startDate);
    const end = this.parseDate(objective.endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const totalDays = ObjectivePredictionService.daysBetween(start, end);
    const elapsedDays = Math.max(
      1,
      Math.min(
        totalDays,
        ObjectivePredictionService.daysBetween(start, today),
      ),
    );

    const currentValue = metric.value;
    const progress = this.computeProgress(
      currentValue,
      objective.targetValue,
      objective.higherIsBetter,
    );

    let prediction: PredictionResult;
    let status = objective.status;
    const periodOver = this.parseDate(objective.endDate).getTime() < today.getTime();

    if (periodOver || objective.status === ObjectiveStatus.COMPLETED || objective.status === ObjectiveStatus.FAILED) {
      prediction = this.predictionService.predict(
        series,
        objective.higherIsBetter,
        objective.targetValue,
        totalDays,
        totalDays,
      );
      if (objective.status === ObjectiveStatus.ACTIVE || objective.status === ObjectiveStatus.AT_RISK) {
        status = progress >= 100 ? ObjectiveStatus.COMPLETED : ObjectiveStatus.FAILED;
      }
    } else {
      prediction = this.predictionService.predict(
        series,
        objective.higherIsBetter,
        objective.targetValue,
        elapsedDays,
        totalDays,
      );
      status = prediction.predictionProbability < 60 ? ObjectiveStatus.AT_RISK : ObjectiveStatus.ACTIVE;
    }

    const previousStatus = objective.status;
    const previousRisk = objective.riskLevel;

    Object.assign(objective, {
      currentValue: Math.round(currentValue * 100) / 100,
      progress: Math.round(progress * 100) / 100,
      predictionProbability: prediction.predictionProbability,
      predictedValue: prediction.predictedValue,
      riskLevel: prediction.riskLevel,
      status,
      recommendation: this.buildRecommendation(objective, prediction, progress),
    });

    await this.objectiveRepo.save(objective);
    await this.recordHistory(objective);
    await this.handleTransitions(objective, previousStatus, previousRisk);
    await this.unlockBadges(objective, scope);
  }

  private computeProgress(
    current: number,
    target: number,
    higherIsBetter: boolean,
  ): number {
    if (target <= 0) return 0;
    if (higherIsBetter) return (current / target) * 100;
    if (current <= 0) return 100;
    return (target / current) * 100;
  }

  // ------------------------------------------------------------------
  // Historique journalier (upsert par jour)
  // ------------------------------------------------------------------

  private async recordHistory(objective: QualityObjective): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await this.historyRepo
      .createQueryBuilder('h')
      .where('h.objective_id = :id', { id: objective.id })
      .andWhere('h.recorded_at >= :start', { start: todayStart })
      .andWhere('h.recorded_at <= :end', { end: todayEnd })
      .getOne();

    if (existing) {
      existing.value = objective.currentValue;
      existing.progress = objective.progress;
      existing.probability = objective.predictionProbability;
      await this.historyRepo.save(existing);
      return;
    }

    await this.historyRepo.save(
      this.historyRepo.create({
        objective: { id: objective.id } as QualityObjective,
        value: objective.currentValue,
        progress: objective.progress,
        probability: objective.predictionProbability,
      }),
    );
  }

  // ------------------------------------------------------------------
  // Alertes automatiques
  // ------------------------------------------------------------------

  private async handleTransitions(
    objective: QualityObjective,
    previousStatus: ObjectiveStatus,
    previousRisk: RiskLevel,
  ): Promise<void> {
    const ownerId = objective.createdBy?.id;
    if (!ownerId) return;

    // Retablissement rapide : l'objectif etait a risque et redevient sain
    if (
      previousStatus === ObjectiveStatus.AT_RISK &&
      (objective.status === ObjectiveStatus.ACTIVE || objective.status === ObjectiveStatus.COMPLETED)
    ) {
      const existing = await this.badgeRepo.findOne({
        where: { user: { id: ownerId }, code: BadgeCode.FAST_RECOVERY },
      });
      if (!existing) {
        await this.badgeRepo.save(
          this.badgeRepo.create({
            code: BadgeCode.FAST_RECOVERY,
            name: BadgeInfo[BadgeCode.FAST_RECOVERY].name,
            description: BadgeInfo[BadgeCode.FAST_RECOVERY].description,
            user: { id: ownerId } as User,
            objective: { id: objective.id } as QualityObjective,
          }),
        );
        this.logger.log(`Badge "fast_recovery" unlocked for user ${ownerId}`);
      }
    }

    if (objective.status === ObjectiveStatus.AT_RISK && previousStatus !== ObjectiveStatus.AT_RISK) {
      await this.notificationService.create(
        ownerId,
        NotificationType.OBJECTIVE_AT_RISK,
        this.buildRiskMessage(objective),
        objective.id,
      );
      return;
    }

    if (objective.status === ObjectiveStatus.AT_RISK && RISK_ORDER[objective.riskLevel] > RISK_ORDER[previousRisk]) {
      await this.notificationService.create(
        ownerId,
        NotificationType.OBJECTIVE_AT_RISK,
        this.buildRiskMessage(objective),
        objective.id,
      );
      return;
    }

    if (objective.status === ObjectiveStatus.COMPLETED && previousStatus !== ObjectiveStatus.COMPLETED) {
      await this.notificationService.create(
        ownerId,
        NotificationType.OBJECTIVE_COMPLETED,
        `Objectif "${objective.title}" atteint avec succes (progression ${objective.progress}%). Felicitations !`,
        objective.id,
      );
      return;
    }

    if (objective.status === ObjectiveStatus.FAILED && previousStatus !== ObjectiveStatus.FAILED) {
      await this.notificationService.create(
        ownerId,
        NotificationType.OBJECTIVE_FAILED,
        `Objectif "${objective.title}" non atteint (progression ${objective.progress}%). Analysez les causes racines et redéfinissez des cibles realistes.`,
        objective.id,
      );
    }
  }

  private buildRiskMessage(objective: QualityObjective): string {
    const probability = objective.predictionProbability ?? 0;
    switch (objective.category) {
      case ObjectiveCategory.COMPLIANCE:
        return `Objectif conformite "${objective.title}" a risque : probabilite de reussite a ${probability}%. Les actions correctives doivent etre intensifiees.`;
      case ObjectiveCategory.CRITICAL_INCIDENTS:
        return `Les incidents critiques augmentent : l'objectif "${objective.title}" risque de ne pas etre atteint (probabilite ${probability}%).`;
      case ObjectiveCategory.DOWNTIME:
        return `Les arrets machine sont eleves : l'objectif "${objective.title}" est a risque (probabilite ${probability}%).`;
      default:
        return `Objectif "${objective.title}" a risque : probabilite de reussite a ${probability}%.`;
    }
  }

  private buildRecommendation(
    objective: QualityObjective,
    prediction: PredictionResult,
    progress: number,
  ): string {
    if (objective.status === ObjectiveStatus.COMPLETED) {
      return 'Objectif atteint. Felicitations ! Maintenez ce niveau de performance pour les prochaines periodes.';
    }
    if (objective.status === ObjectiveStatus.FAILED) {
      return 'Objectif non atteint. Analysez les causes racines, impliquez les agents concernes et fixez des cibles realistes pour le mois prochain.';
    }

    switch (objective.category) {
      case ObjectiveCategory.COMPLIANCE:
        if (prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.CRITICAL) {
          return 'Probabilite de non-atteinte elevee. Lancez des audits cibles sur les lignes rouges et organisez des actions de sensibilisation rapides.';
        }
        if (prediction.riskLevel === RiskLevel.MEDIUM) {
          return 'Objectif en voie de reussite mais fragile. Surveillez les lignes jaunes et renforcez les controles sur les zones sensibles.';
        }
        return 'Excellente dynamique de conformite. Maintenez le rythme des controles actuels.';
      case ObjectiveCategory.CRITICAL_INCIDENTS:
        if (prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.CRITICAL) {
          return 'Le nombre d\'incidents critiques progresse. Identifiez les lignes recurrentes et appliquez des actions correctives immediates.';
        }
        return 'Les incidents critiques restent maitrises. Poursuivez la surveillance quotidienne.';
      case ObjectiveCategory.DOWNTIME:
        if (prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.CRITICAL) {
          return 'Les minutes d\'arret cumulees sont trop elevees. Priorisez les actions de maintenance sur les lignes a fort delais.';
        }
        return 'Les arrets sont sous controle. Continuez a traiter les delais des lignes rouges en priorite.';
      default:
        if (prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.CRITICAL) {
          return `Progression actuelle ${progress}%. Le rythme actuel est insuffisant pour atteindre la cible : intensifiez les actions.`;
        }
        if (prediction.riskLevel === RiskLevel.MEDIUM) {
          return `Progression actuelle ${progress}%. L'objectif reste atteignable, maintenez le rythme et corrigez les ecarts mineurs.`;
        }
        return `Progression actuelle ${progress}%. La trajectoire actuelle est favorable a l'atteinte de l'objectif.`;
    }
  }

  // ------------------------------------------------------------------
  // Badges
  // ------------------------------------------------------------------

  private async unlockBadges(objective: QualityObjective, scope: string): Promise<void> {
    const code = await this.checkBadge(objective, scope);
    if (!code) return;

    const existing = await this.badgeRepo.findOne({
      where: { user: { id: scope }, code },
    });
    if (existing) return;

    const badge = this.badgeRepo.create({
      code,
      name: BadgeInfo[code].name,
      description: BadgeInfo[code].description,
      user: { id: scope } as User,
      objective: { id: objective.id } as QualityObjective,
    });
    await this.badgeRepo.save(badge);
    this.logger.log(`Badge "${code}" unlocked for user ${scope}`);
  }

  private async checkBadge(objective: QualityObjective, scope: string): Promise<BadgeCode | null> {
    if (objective.status !== ObjectiveStatus.COMPLETED) {
      return null;
    }

    // Objectif atteint
    let code: BadgeCode = BadgeCode.GOAL_ACHIEVED;

    // Meilleure performance : depassement de >= 110%
    if (objective.progress >= 110) {
      code = BadgeCode.BEST_PERFORMANCE;
    }

    // Champion qualite : conformite >= 95% a la cloture
    if (
      objective.category === ObjectiveCategory.COMPLIANCE &&
      objective.currentValue >= 95
    ) {
      code = BadgeCode.QUALITY_CHAMPION;
    }

    // 3 mois de succes : 3 objectifs completes sur les 3 derniers mois
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const allObjectives = await this.objectiveRepo.find({
      where: { createdBy: { id: scope } },
    });
    const completedRecent = allObjectives.filter(
      (o) =>
        o.status === ObjectiveStatus.COMPLETED &&
        new Date(o.endDate).getTime() >= threeMonthsAgo.getTime(),
    ).length;
    if (completedRecent >= 3) {
      code = BadgeCode.THREE_MONTHS_SUCCESS;
    }

    return code;
  }

  // ------------------------------------------------------------------
  // Evolution mensuelle (historique)
  // ------------------------------------------------------------------

  private async buildMonthlyEvolution(scope: string | null): Promise<
    { month: string; label: string; avgProgress: number | null; avgProbability: number | null; objectives: number }[]
  > {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const query = this.historyRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.objective', 'o')
      .andWhere('h.recorded_at >= :start', { start: sixMonthsAgo });
    if (scope) {
      query.andWhere('o.created_by = :scope', { scope });
    }
    const rows = await query.getMany();

    const months: { month: string; label: string; avgProgress: number | null; avgProbability: number | null; objectives: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const label = m.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      const monthRows = rows.filter(
        (r) => r.recordedAt >= m && r.recordedAt < next,
      );
      months.push({
        month: key,
        label,
        avgProgress: monthRows.length
          ? Math.round((monthRows.reduce((s, r) => s + r.progress, 0) / monthRows.length) * 10) / 10
          : null,
        avgProbability: monthRows.length
          ? Math.round((monthRows.reduce((s, r) => s + (r.probability ?? 0), 0) / monthRows.length) * 10) / 10
          : null,
        objectives: new Set(monthRows.map((r) => r.objective.id)).size,
      });
    }
    return months;
  }

  // ------------------------------------------------------------------
  // Permissions & portee
  // ------------------------------------------------------------------

  private resolveScope(user: User, superviseurId?: string): string | null {
    if (user.role === UserRole.SUPER_ADMIN) {
      return superviseurId ?? null;
    }
    if (user.role === UserRole.SUPERVISEUR_QUALITE) {
      return user.id;
    }
    return user.superviseurId ?? null;
  }

  private scopeFor(user: User, objective: QualityObjective): string | null {
    if (user.role === UserRole.SUPER_ADMIN) return null;
    const owner = objective.createdBy?.id;
    if (user.role === UserRole.SUPERVISEUR_QUALITE) return owner;
    return owner;
  }

  private assertVisible(user: User, objective: QualityObjective): void {
    if (user.role === UserRole.SUPER_ADMIN) return;
    const owner = objective.createdBy?.id;
    if (user.role === UserRole.SUPERVISEUR_QUALITE && owner === user.id) return;
    if (
      user.role === UserRole.AGENT_QUALITE &&
      owner === user.superviseurId
    ) {
      return;
    }
    throw new ForbiddenException('Acces refuse a cet objectif');
  }

  private assertManageable(user: User, objective: QualityObjective): void {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (
      user.role === UserRole.SUPERVISEUR_QUALITE &&
      objective.createdBy?.id === user.id
    ) {
      return;
    }
    throw new ForbiddenException('Vous ne pouvez gerer que vos propres objectifs');
  }

  private daysRemaining(endDate: string): number {
    const end = this.parseDate(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((end.getTime() - today.getTime()) / MS_PER_DAY));
  }

  private parseDate(value: string): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Date invalide: ${value}`);
    }
    return d;
  }
}

const BadgeInfo: Record<BadgeCode, { name: string; description: string }> = {
  [BadgeCode.GOAL_ACHIEVED]: {
    name: 'Objectif atteint',
    description: 'Vous avez atteint un objectif qualite dans les temps.',
  },
  [BadgeCode.THREE_MONTHS_SUCCESS]: {
    name: '3 mois de succes',
    description: '3 objectifs completes sur les 3 derniers mois.',
  },
  [BadgeCode.BEST_PERFORMANCE]: {
    name: 'Meilleure performance',
    description: 'Objectif depasse de plus de 10% (progression >= 110%).',
  },
  [BadgeCode.FAST_RECOVERY]: {
    name: 'Retablissement rapide',
    description: 'Objectif redevenu sain apres avoir ete signale a risque.',
  },
  [BadgeCode.QUALITY_CHAMPION]: {
    name: 'Champion qualite',
    description: 'Conformite finale >= 95% sur un objectif de conformite.',
  },
};
