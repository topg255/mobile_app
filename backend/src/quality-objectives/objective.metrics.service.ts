import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LigneControle, NoteQualite } from '../quality/entities/ligne-controle.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { ObjectiveCategory, QualityObjective } from './entities/quality-objective.entity';

export interface ObjectiveMetric {
  value: number;
  unit: string;
  higherIsBetter: boolean;
}

export interface ObjectiveSeriesPoint {
  date: Date;
  cumulativeValue: number;
  dailyValue: number;
}

/**
 * Calcule les metriques qualite des objectifs a partir des donnees
 * reelles de production (lignes de controle du superviseur).
 */
@Injectable()
export class ObjectiveMetricsService {
  constructor(
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private parseMinutes(delais: string): number {
    const parsed = parseInt(delais, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  getDefaultUnit(category: ObjectiveCategory): string {
    switch (category) {
      case ObjectiveCategory.COMPLIANCE:
        return '%';
      case ObjectiveCategory.CRITICAL_INCIDENTS:
        return 'incidents';
      case ObjectiveCategory.DOWNTIME:
        return 'minutes';
      case ObjectiveCategory.RESOLUTION_TIME:
        return 'min/ligne';
      case ObjectiveCategory.INSPECTIONS:
        return 'lignes';
      case ObjectiveCategory.PRODUCTIVITY:
        return 'lignes/jour';
      case ObjectiveCategory.PHOTOS:
        return 'photos';
      case ObjectiveCategory.TRAINING:
        return '%';
      default:
        return '';
    }
  }

  isHigherBetter(category: ObjectiveCategory): boolean {
    switch (category) {
      case ObjectiveCategory.CRITICAL_INCIDENTS:
      case ObjectiveCategory.DOWNTIME:
      case ObjectiveCategory.RESOLUTION_TIME:
        return false;
      default:
        return true;
    }
  }

  /**
   * Metrique cumulative sur un sous-ensemble de lignes.
   */
  computeFromLignes(category: ObjectiveCategory, lignes: LigneControle[]): number {
    const total = lignes.length;
    if (total === 0) {
      if (category === ObjectiveCategory.CRITICAL_INCIDENTS) return 0;
      if (category === ObjectiveCategory.DOWNTIME) return 0;
      if (category === ObjectiveCategory.RESOLUTION_TIME) return 0;
      if (category === ObjectiveCategory.PHOTOS) return 0;
      if (category === ObjectiveCategory.INSPECTIONS) return 0;
      return 0;
    }

    switch (category) {
      case ObjectiveCategory.COMPLIANCE: {
        const vert = lignes.filter((l) => l.note === NoteQualite.VERT).length;
        return Math.round((vert / total) * 1000) / 10;
      }
      case ObjectiveCategory.CRITICAL_INCIDENTS:
        return lignes.filter((l) => l.note === NoteQualite.ROUGE).length;
      case ObjectiveCategory.DOWNTIME:
        return lignes.reduce((sum, l) => sum + this.parseMinutes(l.delais), 0);
      case ObjectiveCategory.RESOLUTION_TIME: {
        const minutes = lignes.reduce((sum, l) => sum + this.parseMinutes(l.delais), 0);
        return Math.round((minutes / total) * 10) / 10;
      }
      case ObjectiveCategory.INSPECTIONS:
        return total;
      case ObjectiveCategory.PHOTOS:
        return lignes.filter((l) => l.image && l.image.length > 0).length;
      default:
        return 0;
    }
  }

  /**
   * Valeur actuelle de l'objectif calculee sur la periode [start, end].
   * La formation utilise le taux d'agents approuves comme proxy.
   */
  async computeCurrentValue(
    objective: QualityObjective,
    superviseurId: string,
    lignesCache?: LigneControle[],
  ): Promise<ObjectiveMetric> {
    const category = objective.category;

    if (category === ObjectiveCategory.CUSTOM) {
      return {
        value: objective.currentValue,
        unit: objective.unit,
        higherIsBetter: objective.higherIsBetter,
      };
    }

    if (category === ObjectiveCategory.TRAINING) {
      const agents = await this.userRepo.find({
        where: { superviseurId, role: UserRole.AGENT_QUALITE },
      });
      const approved = agents.filter((a) => a.isApprovedBySuperviseur).length;
      const value =
        agents.length > 0 ? Math.round((approved / agents.length) * 1000) / 10 : 0;
      return { value, unit: '%', higherIsBetter: true };
    }

    const lignes = lignesCache ?? (await this.fetchLignes(superviseurId, objective));
    const value = this.computeFromLignes(category, lignes);
    return { value, unit: objective.unit, higherIsBetter: objective.higherIsBetter };
  }

  /**
   * Serie cumulative jour par jour de la periode de l'objectif.
   * Utilisee pour la prediction statistique et les graphiques.
   */
  async buildDailySeries(
    objective: QualityObjective,
    superviseurId: string,
  ): Promise<ObjectiveSeriesPoint[]> {
    const category = objective.category;

    if (category === ObjectiveCategory.CUSTOM) {
      return [{ date: new Date(), cumulativeValue: objective.currentValue, dailyValue: 0 }];
    }

    if (category === ObjectiveCategory.TRAINING) {
      const metric = await this.computeCurrentValue(objective, superviseurId);
      return [{ date: new Date(), cumulativeValue: metric.value, dailyValue: 0 }];
    }

    const start = this.parseDate(objective.startDate);
    const end = this.parseDate(objective.endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const effectiveEnd = end.getTime() < today.getTime() ? end : today;

    const lignes = await this.ligneRepo
      .createQueryBuilder('ligne')
      .leftJoinAndSelect('ligne.agent', 'agent')
      .where('ligne.created_at >= :start', { start })
      .andWhere('ligne.created_at <= :end', { end: effectiveEnd })
      .andWhere('agent.superviseur_id = :superviseurId', { superviseurId })
      .orderBy('ligne.created_at', 'ASC')
      .getMany();

    const series: ObjectiveSeriesPoint[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(effectiveEnd);
    lastDay.setHours(0, 0, 0, 0);

    const accumulated: LigneControle[] = [];
    while (cursor.getTime() <= lastDay.getTime()) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLignes = lignes.filter(
        (l) => l.createdAt >= cursor && l.createdAt <= dayEnd,
      );
      accumulated.push(...dayLignes);
      const cumulativeValue = this.computeFromLignes(category, accumulated);
      const dailyValue = this.computeFromLignes(category, dayLignes);
      series.push({ date: new Date(cursor), cumulativeValue, dailyValue });
      cursor.setDate(cursor.getDate() + 1);
    }

    if (series.length === 0) {
      series.push({ date: new Date(start), cumulativeValue: 0, dailyValue: 0 });
    }

    return series;
  }

  async fetchLignes(
    superviseurId: string,
    objective: QualityObjective,
  ): Promise<LigneControle[]> {
    const start = this.parseDate(objective.startDate);
    const end = this.parseDate(objective.endDate);
    end.setHours(23, 59, 59, 999);
    return this.ligneRepo
      .createQueryBuilder('ligne')
      .leftJoinAndSelect('ligne.agent', 'agent')
      .where('ligne.created_at >= :start', { start })
      .andWhere('ligne.created_at <= :end', { end })
      .andWhere('agent.superviseur_id = :superviseurId', { superviseurId })
      .getMany();
  }

  private parseDate(value: string): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new Error(`Date invalide: ${value}`);
    }
    return d;
  }
}
