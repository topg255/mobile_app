import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../auth/entities/user.entity';
import {
  LigneControle,
  NoteQualite,
} from '../quality/entities/ligne-controle.entity';
import { QualityObjective } from '../quality-objectives/entities/quality-objective.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import {
  DeliveryStatus,
  EscalationLevel,
  PushCategory,
  PushNotificationHistory,
  PushPriority,
} from './entities/push-notification-history.entity';
import { NotificationAnalytics } from './entities/notification-analytics.entity';
import { PushWebPushService, WebPushPayload } from './push-webpush.service';

export interface SmartPushInput {
  title?: string;
  body?: string;
  category: PushCategory;
  priority: PushPriority;
  data?: Record<string, any>;
  groupKey?: string;
}

const ACTION_DISMISS = { action: 'dismiss', title: 'Dismiss' };
const ACTION_OPEN_DASHBOARD_BUILDERLESS = {
  action: 'open',
  title: 'Open Dashboard',
};

const CATEGORY_FLAG: Record<PushCategory, keyof NotificationPreferences> = {
  [PushCategory.QUALITY_CRITICAL]: 'criticalAlerts',
  [PushCategory.QUALITY_WARNING]: 'systemNotifications',
  [PushCategory.PRODUCTION_STOP]: 'criticalAlerts',
  [PushCategory.AI_REPORT]: 'aiReports',
  [PushCategory.AI_RISK]: 'aiReports',
  [PushCategory.OBJECTIVE_RISK]: 'objectives',
  [PushCategory.OBJECTIVE_COMPLETED]: 'objectives',
  [PushCategory.CHAT_MESSAGE]: 'messages',
  [PushCategory.AGENT_REGISTRATION]: 'systemNotifications',
  [PushCategory.AGENT_APPROVED]: 'systemNotifications',
  [PushCategory.BENCHMARK]: 'benchmarkAlerts',
  [PushCategory.CAPA]: 'capaAlerts',
  [PushCategory.SYSTEM]: 'systemNotifications',
};

@Injectable()
export class PushNotifierService {
  private readonly logger = new Logger(PushNotifierService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepo: Repository<NotificationPreferences>,
    @InjectRepository(PushNotificationHistory)
    private readonly historyRepo: Repository<PushNotificationHistory>,
    @InjectRepository(NotificationAnalytics)
    private readonly analyticsRepo: Repository<NotificationAnalytics>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    private readonly webPushService: PushWebPushService,
    private readonly configService: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // Abonnements
  // ------------------------------------------------------------------

  async subscribe(
    user: User,
    endpoint: string,
    p256dh: string,
    auth: string,
    meta: {
      browser?: string;
      device?: string;
      platform?: string;
      userAgent?: string;
    },
  ): Promise<PushSubscription> {
    let sub = await this.subscriptionRepo.findOne({ where: { endpoint } });
    if (sub) {
      if (sub.user.id !== user.id) {
        sub.user = user;
      }
      sub.p256dh = p256dh;
      sub.auth = auth;
    } else {
      sub = this.subscriptionRepo.create({
        user,
        endpoint,
        p256dh,
        auth,
        browser: meta.browser || 'unknown',
        device: meta.device || 'desktop',
        platform: meta.platform || 'unknown',
        userAgent: meta.userAgent || null,
      });
    }
    sub.isActive = true;
    sub.lastActivityAt = new Date();
    return this.subscriptionRepo.save(sub);
  }

  async unsubscribe(
    user: User,
    endpoint?: string,
  ): Promise<{ message: string }> {
    if (endpoint) {
      await this.subscriptionRepo.update(
        { endpoint },
        { isActive: false, lastActivityAt: new Date() },
      );
      return { message: 'Abonnement desactive' };
    }
    await this.subscriptionRepo.update(
      { user: { id: user.id } },
      { isActive: false, lastActivityAt: new Date() },
    );
    return { message: 'Tous les abonnements desactives' };
  }

  async getSubscriptions(user: User): Promise<PushSubscription[]> {
    return this.subscriptionRepo.find({
      where: { user: { id: user.id }, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  // ------------------------------------------------------------------
  // Envoi principal (smart push)
  // ------------------------------------------------------------------

  async send(
    userId: string,
    input: SmartPushInput,
  ): Promise<PushNotificationHistory | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const subscriptions = await this.subscriptionRepo.find({
      where: { user: { id: userId }, isActive: true },
    });
    if (subscriptions.length === 0) return null;

    const preferences = await this.getOrCreatePreferences(userId);
    const flag = CATEGORY_FLAG[input.category];
    if (!preferences[flag] && input.priority !== PushPriority.CRITICAL) {
      return null;
    }
    if (
      this.inDndWindow(preferences) &&
      input.priority !== PushPriority.CRITICAL
    ) {
      return null;
    }

    const title = input.title ?? this.defaultTitle(input.category);
    const body = input.body ?? '';
    const priority = input.priority;

    // Regroupement (uniquement non-critique, dans la fenetre configuree)
    if (input.groupKey && priority !== PushPriority.CRITICAL) {
      const grouped = await this.tryGroup(user, input, title, body);
      if (grouped) return grouped;
    }

    const history = await this.recordAndPush(
      user,
      title,
      body,
      input.category,
      priority,
      input.data ?? {},
      input.groupKey ?? null,
      1,
    );
    return history;
  }

  private async tryGroup(
    user: User,
    input: SmartPushInput,
    title: string,
    body: string,
  ): Promise<PushNotificationHistory | null> {
    const windowMin = parseInt(
      this.configService.get<string>('PUSH_GROUPING_WINDOW_MIN', '10'),
      10,
    );
    const since = new Date(Date.now() - windowMin * 60_000);

    const existing = await this.historyRepo
      .createQueryBuilder('h')
      .where('h.user_id = :userId', { userId: user.id })
      .andWhere('h.group_key = :groupKey', { groupKey: input.groupKey })
      .andWhere('h.delivery_status = :status', { status: DeliveryStatus.SENT })
      .andWhere('h.priority != :critical', { critical: PushPriority.CRITICAL })
      .andWhere('h.sent_at >= :since', { since })
      .orderBy('h.sent_at', 'DESC')
      .getOne();

    if (!existing) return null;

    existing.groupCount += 1;
    const existingData = (existing.data as Record<string, any>) ?? {};
    existingData.counts = existingData.counts ?? {};
    existingData.counts[input.category] =
      (existingData.counts[input.category] ?? 0) + 1;
    existing.data = existingData;
    existing.body = this.groupedBody(existing.groupCount, existingData.counts);
    await this.historyRepo.save(existing);

    const payload = this.buildPayload(existing, existingData.counts || {});
    await this.deliver(user.id, payload, existing.priority);
    return existing;
  }

  private groupedBody(count: number, counts: Record<string, number>): string {
    const critical = counts[PushCategory.QUALITY_CRITICAL] ?? 0;
    const warning = counts[PushCategory.QUALITY_WARNING] ?? 0;
    const parts: string[] = [];
    if (critical > 0) parts.push(`Critiques: ${critical}`);
    if (warning > 0) parts.push(`Alertes: ${warning}`);
    return `${count} incident(s) qualite detecte(s).${parts.length ? ` ${parts.join(' · ')}.` : ''}`;
  }

  private async recordAndPush(
    user: User,
    title: string,
    body: string,
    category: PushCategory,
    priority: PushPriority,
    data: Record<string, any>,
    groupKey: string | null,
    groupCount: number,
  ): Promise<PushNotificationHistory | null> {
    const history = this.historyRepo.create({
      user,
      title,
      body,
      category,
      priority,
      data,
      deliveryStatus: DeliveryStatus.SENT,
      groupKey,
      groupCount,
      devicePlatform: user.role,
    });
    const saved = await this.historyRepo.save(history);

    const payload = this.buildPayload(saved, data.counts);
    await this.deliver(user.id, payload, priority);
    return saved;
  }

  private buildPayload(
    history: PushNotificationHistory,
    counts?: Record<string, number>,
  ): WebPushPayload {
    const critical =
      history.priority === PushPriority.CRITICAL ||
      history.priority === PushPriority.HIGH;
    const frontUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const icon = `${frontUrl}/icons/icon-192.png`;

    const actions = [
      ...this.actionsFor(history.category, history.data),
      ACTION_DISMISS,
    ];

    return {
      title: history.title,
      body: history.body,
      icon,
      badge: icon,
      tag: history.groupKey ?? `${history.category}:${history.id}`,
      data: {
        ...(history.data ?? {}),
        historyId: history.id,
        category: history.category,
        priority: history.priority,
        counts: counts ?? (history.data as any)?.counts,
        timestamp: new Date().toISOString(),
      },
      actions,
      vibrate:
        critical && history.priority === PushPriority.CRITICAL
          ? [200, 80, 200, 80, 400]
          : null,
      requireInteraction: critical,
      renotify: history.groupCount > 1,
    };
  }

  private actionsFor(
    category: PushCategory,
    data: Record<string, any> | null,
  ): any[] {
    const url = data?.url ?? '/dashboard';
    switch (category) {
      case PushCategory.QUALITY_CRITICAL:
      case PushCategory.PRODUCTION_STOP:
        return [
          { action: 'open', title: 'Open Incident' },
          { action: 'assign', title: 'Assign Technician' },
        ];
      case PushCategory.QUALITY_WARNING:
        return [{ action: 'open', title: 'Open Incidents' }];
      case PushCategory.AI_REPORT:
      case PushCategory.AI_RISK:
        return [{ action: 'open', title: 'Open Report' }];
      case PushCategory.OBJECTIVE_RISK:
      case PushCategory.OBJECTIVE_COMPLETED:
        return [{ action: 'open', title: 'Open Objectives' }];
      case PushCategory.CHAT_MESSAGE:
        return [{ action: 'open', title: 'Open Chat' }];
      case PushCategory.AGENT_REGISTRATION:
      case PushCategory.AGENT_APPROVED:
        return [{ action: 'open', title: 'Open Dashboard' }];
      case PushCategory.BENCHMARK:
        return [{ action: 'open', title: 'Open Dashboard' }];
      case PushCategory.CAPA:
        return [{ action: 'open', title: 'Open CAPA' }];
      default:
        return [{ action: 'open', title: 'Open Dashboard' }];
    }
  }

  /**
   * Envoie aux abonnements actifs de l'utilisateur, nettoie les abonnements
   * expires et met a jour les analytics "sent".
   */
  async deliver(
    userId: string,
    payload: WebPushPayload,
    priority: PushPriority,
  ): Promise<number> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { user: { id: userId }, isActive: true },
    });
    let deliveredCount = 0;

    for (const sub of subscriptions) {
      const result = await this.webPushService.send(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        priority === PushPriority.CRITICAL
          ? 'high'
          : priority === PushPriority.MEDIUM
            ? 'normal'
            : 'low',
        priority === PushPriority.CRITICAL ? 600 : 120,
      );
      if (result.success) {
        deliveredCount += 1;
        sub.lastActivityAt = new Date();
      } else if (result.error === 'SubscriptionExpired') {
        sub.isActive = false;
      }
      await this.subscriptionRepo.save(sub);
    }

    await this.incrementAnalytics(userId, 'sent', deliveredCount);
    return deliveredCount;
  }

  // ------------------------------------------------------------------
  // Statuts (appeles par le Service Worker)
  // ------------------------------------------------------------------

  async updateStatus(
    requester: User,
    historyId: string,
    status: 'delivered' | 'opened' | 'clicked' | 'dismissed',
  ): Promise<{ message: string }> {
    const history = await this.historyRepo.findOne({
      where: { id: historyId },
    });
    if (!history || history.user.id !== requester.id) {
      return { message: 'Notification introuvable' };
    }

    const now = new Date();
    switch (status) {
      case 'delivered':
        if (!history.deliveredAt) {
          history.deliveredAt = now;
          history.deliveryStatus = DeliveryStatus.DELIVERED;
          await this.historyRepo.save(history);
          await this.incrementAnalytics(requester.id, 'delivered', 1);
        }
        break;
      case 'opened':
        if (!history.openedAt) {
          history.openedAt = now;
          if (!history.deliveredAt) history.deliveredAt = now;
          history.deliveryStatus = DeliveryStatus.OPENED;
          await this.historyRepo.save(history);
          await this.incrementAnalytics(requester.id, 'opened', 1);
        }
        break;
      case 'clicked':
        if (!history.clickedAt) {
          history.clickedAt = now;
          if (!history.openedAt) {
            history.openedAt = now;
          }
          if (!history.deliveredAt) {
            history.deliveredAt = now;
          }
          history.deliveryStatus = DeliveryStatus.CLICKED;
          await this.historyRepo.save(history);
          await this.incrementAnalytics(requester.id, 'clicked', 1);
          await this.recomputeResponseTimes(requester.id);
        }
        break;
      case 'dismissed':
        if (!history.dismissedAt) {
          history.dismissedAt = now;
          history.deliveryStatus = DeliveryStatus.DISMISSED;
          await this.historyRepo.save(history);
          await this.incrementAnalytics(requester.id, 'dismissed', 1);
        }
        break;
    }
    return { message: 'Statut mis a jour' };
  }

  // ------------------------------------------------------------------
  // Historique / prefs / analytics
  // ------------------------------------------------------------------

  async getHistory(user: User, page = 1, limit = 25) {
    const [items, total] = await this.historyRepo.findAndCount({
      where: { user: { id: user.id } },
      order: { sentAt: 'DESC' },
      take: Math.max(1, Math.min(limit, 100)),
      skip: (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100)),
    });
    return {
      items,
      total,
      page: Math.max(1, page),
      limit: Math.max(1, Math.min(limit, 100)),
    };
  }

  async getOrCreatePreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!prefs) {
      prefs = this.preferencesRepo.create({ user: { id: userId } as User });
      prefs = await this.preferencesRepo.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(
    userId: string,
    data: Partial<NotificationPreferences>,
  ) {
    const prefs = await this.getOrCreatePreferences(userId);
    Object.assign(prefs, data);
    return this.preferencesRepo.save(prefs);
  }

  async getAnalytics(user: User, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const where: any = { date: MoreThanOrEqual(this.toDateStr(since)) };
    if (user.role !== UserRole.SUPER_ADMIN) {
      where.user = { id: user.id };
    }

    const rows = await this.analyticsRepo.find({
      where,
      order: { date: 'ASC' },
    });

    const totals = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      dismissed: 0,
      failed: 0,
      avgResponseMs: 0,
      criticalResponseMs: 0,
    };
    const sumMappers: Record<
      keyof typeof totals,
      (r: NotificationAnalytics) => number
    > = {
      sent: (r) => r.sent,
      delivered: (r) => r.delivered,
      opened: (r) => r.opened,
      clicked: (r) => r.clicked,
      dismissed: (r) => r.dismissed,
      failed: (r) => r.failed,
      avgResponseMs: (r) => r.avgResponseMs,
      criticalResponseMs: (r) => r.criticalResponseMs,
    };
    let countAvg = 0;
    let countCrit = 0;
    for (const r of rows) {
      for (const key of Object.keys(sumMappers) as (keyof typeof totals)[]) {
        if (key === 'avgResponseMs') {
          if (r.avgResponseMs > 0) {
            totals.avgResponseMs += r.avgResponseMs;
            countAvg += 1;
          }
        } else if (key === 'criticalResponseMs') {
          if (r.criticalResponseMs > 0) {
            totals.criticalResponseMs += r.criticalResponseMs;
            countCrit += 1;
          }
        } else {
          totals[key] += sumMappers[key](r);
        }
      }
    }
    if (countAvg)
      totals.avgResponseMs = Math.round(totals.avgResponseMs / countAvg);
    if (countCrit)
      totals.criticalResponseMs = Math.round(
        totals.criticalResponseMs / countCrit,
      );

    const daily = rows.map((r) => ({
      date: r.date,
      sent: r.sent,
      delivered: r.delivered,
      opened: r.opened,
      clicked: r.clicked,
      dismissed: r.dismissed,
    }));

    // Top superviseurs actifs (super admin uniquement)
    let topSupervisors: any[] = [];
    if (user.role === UserRole.SUPER_ADMIN) {
      const top = await this.analyticsRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.user', 'u')
        .select('a.user_id', 'userId')
        .addSelect('u.first_name', 'firstName')
        .addSelect('u.last_name', 'lastName')
        .addSelect('SUM(a.sent)', 'sent')
        .addSelect('SUM(a.clicked)', 'clicked')
        .addSelect('SUM(a.opened)', 'opened')
        .where('a.date >= :since', { since: this.toDateStr(since) })
        .andWhere('u.role = :role', { role: UserRole.SUPERVISEUR_QUALITE })
        .groupBy('a.user_id, u.first_name, u.last_name')
        .orderBy('SUM(a.sent)', 'DESC')
        .take(10)
        .getRawMany();
      topSupervisors = top.map((t: any) => ({
        userId: t.userId,
        name: `${t.firstName} ${t.lastName}`,
        sent: Number(t.sent),
        opened: Number(t.opened),
        clicked: Number(t.clicked),
      }));
    }

    return { totals, daily, topSupervisors };
  }

  // ------------------------------------------------------------------
  // Test
  // ------------------------------------------------------------------

  async sendTest(user: User): Promise<{ message: string }> {
    const subscriptions = await this.getSubscriptions(user);
    if (subscriptions.length === 0) {
      return {
        message:
          'Aucun navigateur enregistre. Autorisez les notifications puis reessayez.',
      };
    }
    await this.send(user.id, {
      category: PushCategory.SYSTEM,
      priority: PushPriority.MEDIUM,
      title: '🔔 Test de notification reussi',
      body: `Cette notification confirme que les notifications sont actives sur ${subscriptions[0].browser}.`,
      data: { url: '/dashboard', type: 'test' },
    });
    return { message: 'Notification de test envoyee' };
  }

  // ------------------------------------------------------------------
  // Diffusions / cle VAPID publique
  // ------------------------------------------------------------------

  getVapidPublicKey(): string | null {
    return this.webPushService.getVapidPublicKey();
  }

  async usersByRole(role: UserRole): Promise<User[]> {
    return this.userRepo.find({ where: { role } });
  }

  async broadcast(
    userIds: string[],
    input: SmartPushInput,
  ): Promise<{ sentCount: number; reachedCount: number }> {
    let sentCount = 0;
    let reachedCount = 0;
    for (const id of userIds) {
      const result = await this.send(id, input);
      if (result) {
        sentCount += 1;
        reachedCount += 1;
      }
    }
    return { sentCount, reachedCount };
  }

  // ------------------------------------------------------------------
  // Builders de contenu intelligent
  // ------------------------------------------------------------------

  async notifyQualityIncident(
    superviseurId: string,
    ligne: LigneControle,
    agent: User,
  ): Promise<void> {
    const delais = this.parseMinutes(ligne.delais);
    const risk = this.estimateRisk(ligne.note, delais);
    const similar = await this.similarIncidents(ligne, agent.id, 48);
    const aiHint =
      similar >= 2
        ? ` Cette ligne a genere ${similar} incidents similaires au cours des dernieres 48 heures.`
        : this.recommendationFor(ligne.note, delais);

    const isProductionStop = ligne.note === NoteQualite.ROUGE && delais >= 120;

    const category = isProductionStop
      ? PushCategory.PRODUCTION_STOP
      : ligne.note === NoteQualite.ROUGE
        ? PushCategory.QUALITY_CRITICAL
        : PushCategory.QUALITY_WARNING;

    const priority =
      category === PushCategory.PRODUCTION_STOP ||
      category === PushCategory.QUALITY_CRITICAL
        ? PushPriority.CRITICAL
        : PushPriority.HIGH;

    const title =
      category === PushCategory.PRODUCTION_STOP
        ? '🚨 Production Stopped'
        : category === PushCategory.QUALITY_CRITICAL
          ? '🔴 Alerte Production Critique'
          : '🟡 Alerte Qualité';

    const body = [
      `Ligne ${ligne.nomLigne} (${ligne.note.toUpperCase()}) signalee.`,
      `Agent: ${agent.firstName} ${agent.lastName}`,
      `Duree: ${ligne.delais} min`,
      `Risque production estime: ${risk}%`,
      `Action recommande: ${aiHint}`,
    ].join('\n');

    await this.send(superviseurId, {
      category,
      priority,
      title,
      body,
      data: {
        type: 'quality_line',
        lineId: ligne.id,
        url: '/dashboard?tab=lignes',
        line: ligne.nomLigne,
        agent: `${agent.firstName} ${agent.lastName}`,
        severity: ligne.note,
        risk,
        recommendation: aiHint,
      },
      groupKey:
        category === PushCategory.QUALITY_WARNING
          ? `quality-warnings:${superviseurId}:${new Date().toISOString().slice(0, 10)}`
          : undefined,
    });
  }

  async notifyAiReport(
    superviseurId: string,
    superviseurName: string,
    kpis: {
      totalLignes: number;
      rougeCount: number;
      rougePercent: number;
      vertPercent: number;
    },
    reportId?: string,
  ): Promise<void> {
    const highRisk = kpis.rougePercent >= 25;

    await this.send(superviseurId, {
      category: PushCategory.AI_REPORT,
      priority: highRisk ? PushPriority.HIGH : PushPriority.MEDIUM,
      title: `🤖 Rapport IA quotidien ${superviseurName}`,
      body:
        `Conformite: ${kpis.vertPercent}% · Critiques: ${kpis.rougeCount} (${kpis.rougePercent}%) · Lignes: ${kpis.totalLignes}.` +
        (highRisk
          ? " Risque eleve detecte par l'IA : actions correctives recommandees."
          : ''),
      data: { type: 'ai_report', reportId, url: '/dashboard?tab=ai-reports' },
    });

    if (highRisk) {
      await this.send(superviseurId, {
        category: PushCategory.AI_RISK,
        priority: PushPriority.CRITICAL,
        title: `⚠️ Risque Élevé détecté par l'IA`,
        body: `Le taux de lignes critiques atteint ${kpis.rougePercent}%. Intervention immediate recommandee sur les lignes rouges.`,
        data: { type: 'ai_risk', reportId, url: '/dashboard?tab=ai-reports' },
      });
    }
  }

  async notifyObjectiveRisk(
    superviseurId: string,
    objective: QualityObjective,
    probability: number,
  ): Promise<void> {
    await this.send(superviseurId, {
      category: PushCategory.OBJECTIVE_RISK,
      priority: PushPriority.HIGH,
      title: `🎯 Objectif "${objective.title}" à risque`,
      body:
        `Probabilite de reussite: ${probability}%. Progression: ${objective.progress}% sur une cible de ${objective.targetValue}.` +
        ` ${this.objectiveRecommendation(objective)}`,
      data: {
        type: 'objective_risk',
        objectiveId: objective.id,
        url: '/dashboard?tab=quality-objectives',
      },
    });
  }

  async notifyObjectiveCompleted(
    superviseurId: string,
    objective: QualityObjective,
    badge?: string,
  ): Promise<void> {
    await this.send(superviseurId, {
      category: PushCategory.OBJECTIVE_COMPLETED,
      priority: PushPriority.MEDIUM,
      title: `🏆 Objectif "${objective.title}" atteint`,
      body:
        `Resultat: ${objective.currentValue} (cible ${objective.targetValue}).` +
        (badge ? ` Badge debloque: ${badge}.` : ' Felicitations !'),
      data: {
        type: 'objective_completed',
        objectiveId: objective.id,
        url: '/dashboard?tab=quality-objectives',
      },
    });
  }

  async notifyObjectiveFailed(
    superviseurId: string,
    objective: QualityObjective,
  ): Promise<void> {
    await this.send(superviseurId, {
      category: PushCategory.OBJECTIVE_RISK,
      priority: PushPriority.HIGH,
      title: `🎯 Objectif non atteint`,
      body: `L'objectif "${objective.title}" n'a pas ete atteint (progression ${objective.progress}%). Analysez les causes racines.`,
      data: {
        type: 'objective_failed',
        objectiveId: objective.id,
        url: '/dashboard?tab=quality-objectives',
      },
    });
  }

  async notifyChatMessage(
    receiverId: string,
    sender: User,
    content: string,
  ): Promise<void> {
    const preview =
      content.length > 80 ? `${content.slice(0, 80)}...` : content;
    await this.send(receiverId, {
      category: PushCategory.CHAT_MESSAGE,
      priority: PushPriority.MEDIUM,
      title: `💬 ${sender.firstName} ${sender.lastName}`,
      body: preview,
      data: {
        type: 'chat_message',
        senderId: sender.id,
        url: '/dashboard?tab=messages',
      },
    });
  }

  async notifyAgentRegistration(
    superviseurId: string,
    agent: User,
  ): Promise<void> {
    await this.send(superviseurId, {
      category: PushCategory.AGENT_REGISTRATION,
      priority: PushPriority.MEDIUM,
      title: '👤 Nouvel agent enregistré',
      body: `${agent.firstName} ${agent.lastName} (matricule ${agent.matricule}) demande son rattachement. Approuvez-le pour activer son acces.`,
      data: {
        type: 'agent_registration',
        agentId: agent.id,
        url: '/dashboard?tab=mes-agents',
      },
    });
  }

  async notifyAgentApproved(
    agentId: string,
    superviseurName: string,
  ): Promise<void> {
    await this.send(agentId, {
      category: PushCategory.AGENT_APPROVED,
      priority: PushPriority.MEDIUM,
      title: '✅ Agent approuvé',
      body: `Votre compte a ete approuve par ${superviseurName}. Vous pouvez maintenant ajouter des lignes de controle.`,
      data: { type: 'agent_approved', url: '/dashboard' },
    });
  }

  async notifyBenchmark(
    superviseurId: string,
    rank: number,
    total: number,
    compliance: number,
  ): Promise<void> {
    const prefs = await this.getOrCreatePreferences(superviseurId);
    const previous = prefs.lastBenchmarkRank;
    if (previous !== null && previous === rank) return;

    const delta =
      previous === null
        ? ''
        : rank < previous
          ? ' +1 (progression)'
          : ' (baisse)';
    await this.send(superviseurId, {
      category: PushCategory.BENCHMARK,
      priority: PushPriority.MEDIUM,
      title: '📊 Benchmark de conformité mis à jour',
      body: `Votre classement est #${rank} / ${total} (conformite ${compliance}%)${delta}.`,
      data: {
        type: 'benchmark',
        rank,
        total,
        url: '/dashboard?tab=ai-reports',
      },
    });
    if (previous !== rank) {
      prefs.lastBenchmarkRank = rank;
      await this.preferencesRepo.save(prefs);
    }
  }

  async notifyCapa(
    superviseurId: string,
    capa: { ref: string; title: string },
  ): Promise<void> {
    await this.send(superviseurId, {
      category: PushCategory.CAPA,
      priority: PushPriority.HIGH,
      title: `📄 CAPA générée ${capa.ref}`,
      body: `Action corrective demandee: ${capa.title}.`,
      data: { type: 'capa', ref: capa.ref, url: '/dashboard?tab=ai-reports' },
    });
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private estimateRisk(note: NoteQualite, delais: number): number {
    if (note === NoteQualite.ROUGE) {
      return Math.min(95, Math.round(30 + delais * 0.6));
    }
    if (note === NoteQualite.JAUNE) {
      return Math.min(60, Math.round(12 + delais * 0.4));
    }
    return Math.round(5 + delais * 0.2);
  }

  private recommendationFor(note: NoteQualite, delais: number): string {
    if (note === NoteQualite.ROUGE && delais >= 120) {
      return 'Arret de production. Inspection immediate et remise en route apres validation.';
    }
    if (note === NoteQualite.ROUGE) {
      return `Inspection immediate requise. Mettre la ligne hors production le temps de l'analyse.`;
    }
    if (note === NoteQualite.JAUNE) {
      return 'Surveillance renforcee et action corrective sous 2 heures recommandee.';
    }
    return 'Continuer la surveillance de routine.';
  }

  private objectiveRecommendation(objective: QualityObjective): string {
    if (objective.category === 'compliance') {
      return 'Intensifiez les audits cibles sur les lignes rouges.';
    }
    if (objective.category === 'critical_incidents') {
      return 'Identifiez les lignes recurrentes et appliquez des actions correctives immediates.';
    }
    if (objective.category === 'downtime') {
      return 'Priorisez la maintenance sur les lignes a fort delais.';
    }
    return 'Renforcez les actions en cours pour tenir la cible.';
  }

  private async similarIncidents(
    ligne: LigneControle,
    agentId: string,
    hours: number,
  ): Promise<number> {
    const since = new Date(Date.now() - hours * 3_600_000);
    try {
      const count = await this.ligneRepo
        .createQueryBuilder('ligne')
        .where('ligne.nom_ligne = :nom', { nom: ligne.nomLigne })
        .andWhere('ligne.note = :note', { note: NoteQualite.ROUGE })
        .andWhere('ligne.agent_id = :agentId', { agentId })
        .andWhere('ligne.created_at >= :since', { since })
        .getCount();
      return count;
    } catch {
      return 0;
    }
  }

  private parseMinutes(delais: string): number {
    const parsed = parseInt(delais, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  private inDndWindow(prefs: NotificationPreferences): boolean {
    if (!prefs.dndEnabled) return false;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = prefs.dndStart.split(':').map(Number);
    const [eh, em] = prefs.dndEnd.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start === end) return false;
    if (start < end) {
      return minutes >= start && minutes < end;
    }
    return minutes >= start || minutes < end;
  }

  private defaultTitle(category: PushCategory): string {
    switch (category) {
      case PushCategory.QUALITY_CRITICAL:
        return '🔴 Incident Qualité Critique';
      case PushCategory.QUALITY_WARNING:
        return '🟡 Alerte Qualité';
      case PushCategory.PRODUCTION_STOP:
        return '🚨 Production Stopped';
      case PushCategory.AI_REPORT:
        return '🤖 Rapport IA généré';
      case PushCategory.OBJECTIVE_RISK:
        return '🎯 Objectif à risque';
      case PushCategory.OBJECTIVE_COMPLETED:
        return '🏆 Objectif atteint';
      case PushCategory.CHAT_MESSAGE:
        return '💬 Nouveau message';
      case PushCategory.AGENT_REGISTRATION:
        return '👤 Nouvel agent';
      case PushCategory.AGENT_APPROVED:
        return '✅ Agent approuvé';
      case PushCategory.BENCHMARK:
        return '📊 Benchmark mis à jour';
      case PushCategory.AI_RISK:
        return '⚠️ Risque élevé (IA)';
      case PushCategory.CAPA:
        return '📄 CAPA générée';
      default:
        return '🔔 Notification';
    }
  }

  private async incrementAnalytics(
    userId: string,
    field: 'sent' | 'delivered' | 'opened' | 'clicked' | 'dismissed' | 'failed',
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    const date = this.toDateStr(new Date());
    let row = await this.analyticsRepo.findOne({
      where: { user: { id: userId }, date },
    });
    if (!row) {
      row = this.analyticsRepo.create({ user: { id: userId } as User, date });
    }
    row[field] = (row[field] ?? 0) + amount;
    await this.analyticsRepo.save(row);
  }

  private async recomputeResponseTimes(userId: string): Promise<void> {
    const today = this.toDateStr(new Date());
    const rows = await this.historyRepo.find({
      where: { user: { id: userId } },
      order: { sentAt: 'DESC' },
      take: 100,
    });
    const clicked = rows.filter((r) => r.clickedAt);
    let totalMs = 0;
    let criticalMs = 0;
    let n = 0;
    let nCrit = 0;
    for (const r of clicked) {
      const ms = r.clickedAt!.getTime() - r.sentAt.getTime();
      totalMs += ms;
      n += 1;
      if (r.priority === 'critical') {
        criticalMs += ms;
        nCrit += 1;
      }
    }
    const row = await this.analyticsRepo.findOne({
      where: { user: { id: userId }, date: today },
    });
    if (row) {
      row.avgResponseMs = n ? Math.round(totalMs / n) : 0;
      row.criticalResponseMs = nCrit ? Math.round(criticalMs / nCrit) : 0;
      await this.analyticsRepo.save(row);
    }
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
