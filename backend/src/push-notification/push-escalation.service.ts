import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import {
  DeliveryStatus,
  EscalationLevel,
  PushCategory,
  PushNotificationHistory,
  PushPriority,
} from './entities/push-notification-history.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSystemConfig } from './entities/push-system-config.entity';
import { PushNotifierService } from './push-notifier.service';
import { UpdateEscalationDto } from './dto/push.dto';

const ESCALATION_ROLE_LABEL: Record<number, string> = {
  [EscalationLevel.PRODUCTION_MANAGER]: 'Responsable Production',
  [EscalationLevel.QUALITY_MANAGER]: 'Responsable Qualite',
  [EscalationLevel.PLANT_DIRECTOR]: 'Directeur de site',
};

@Injectable()
export class PushEscalationService {
  private readonly logger = new Logger(PushEscalationService.name);

  constructor(
    @InjectRepository(PushNotificationHistory)
    private readonly historyRepo: Repository<PushNotificationHistory>,
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(PushSystemConfig)
    private readonly configRepo: Repository<PushSystemConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifier: PushNotifierService,
    private readonly notificationService: NotificationService,
  ) {}

  // ------------------------------------------------------------------
  // Config systeme (seuil d'escalade, fenetre de regroupement)
  // ------------------------------------------------------------------

  async getOrCreateConfig(): Promise<PushSystemConfig> {
    let config = await this.configRepo.findOne({ order: { id: 'ASC' } });
    if (!config) {
      config = this.configRepo.create();
      config = await this.configRepo.save(config);
    }
    return config;
  }

  async updateConfig(dto: UpdateEscalationDto): Promise<PushSystemConfig> {
    const config = await this.getOrCreateConfig();
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  // ------------------------------------------------------------------
  // Escalade automatique (toutes les 30 secondes)
  // ------------------------------------------------------------------

  @Cron('*/30 * * * * *')
  async runEscalation(): Promise<{ escalated: number }> {
    const config = await this.getOrCreateConfig();
    if (!config.enabled) return { escalated: 0 };

    const candidates = await this.historyRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.user', 'user')
      .where('h.clicked_at IS NULL')
      .andWhere('h.dismissed_at IS NULL')
      .andWhere('h.delivery_status != :failed', {
        failed: DeliveryStatus.FAILED,
      })
      .andWhere('h.priority IN (:...priorities)', {
        priorities: [
          PushPriority.CRITICAL,
          PushPriority.HIGH,
          PushPriority.MEDIUM,
        ],
      })
      .andWhere('h.escalation_level < :maxLevel', {
        maxLevel: EscalationLevel.PLANT_DIRECTOR,
      })
      .getMany();

    let escalated = 0;
    for (const history of candidates) {
      const baseMinutes = this.thresholdFor(history.priority, config);
      const nextLevel = history.escalationLevel + 1;
      const deadlineMs = baseMinutes * nextLevel * 60_000;
      const elapsedMs = Date.now() - new Date(history.sentAt).getTime();
      if (elapsedMs < deadlineMs) continue;

      const target = await this.escalationTarget(history.user);
      if (!target) continue;

      history.escalationLevel = nextLevel;
      history.escalatedAt = new Date();
      await this.historyRepo.save(history);

      const label = ESCALATION_ROLE_LABEL[nextLevel] ?? 'Superieur';
      const title = `🆘 Escalade: ${history.title}`;
      const body =
        `Aucune action sur "${history.title}" apres ${baseMinutes * nextLevel} min. ` +
        `Escaladee vers le ${label}.`;

      await this.notifier.send(target.id, {
        category: PushCategory.SYSTEM,
        priority:
          history.priority === PushPriority.CRITICAL ||
          nextLevel >= EscalationLevel.QUALITY_MANAGER
            ? PushPriority.CRITICAL
            : PushPriority.HIGH,
        title,
        body,
        data: {
          type: 'escalation',
          escalationLevel: nextLevel,
          originalHistoryId: history.id,
          originalCategory: history.category,
          originalPriority: history.priority,
          url: history.data?.url ?? '/dashboard',
        },
      });

      await this.notificationService.create(
        target.id,
        NotificationType.SYSTEM,
        `${title} — ${body}`,
        history.id,
      );      escalated += 1;
      this.logger.log(
        `Escalation niveau ${nextLevel} pour ${history.user.firstName} ${history.user.lastName} -> ${target.firstName} ${target.lastName}`,
      );
    }

    if (escalated > 0) {
      this.logger.log(`Escalades traitees: ${escalated}`);
    }
    return { escalated };
  }

  private thresholdFor(
    priority: PushPriority,
    config: PushSystemConfig,
  ): number {
    switch (priority) {
      case PushPriority.CRITICAL:
        return config.criticalEscalationMin;
      case PushPriority.HIGH:
        return config.highEscalationMin;
      default:
        return config.mediumEscalationMin;
    }
  }

  private async escalationTarget(recipient: User): Promise<User | null> {
    if (recipient.role === UserRole.AGENT_QUALITE && recipient.superviseurId) {
      const superviseur = await this.userRepo.findOne({
        where: { id: recipient.superviseurId, isApproved: true },
      });
      if (superviseur) return superviseur;
    }
    const admin = await this.userRepo.findOne({
      where: { role: UserRole.SUPER_ADMIN, isApproved: true },
      order: { createdAt: 'ASC' },
    });
    if (admin && admin.id !== recipient.id) return admin;
    if (admin) return admin;
    return null;
  }

  // ------------------------------------------------------------------
  // Nettoyage (quotidien 03h00)
  // ------------------------------------------------------------------

  @Cron('0 0 3 * * *')
  async cleanup(): Promise<{
    subscriptionsDeactivated: number;
    historyDeleted: number;
  }> {
    const cutoff90d = new Date(Date.now() - 90 * 24 * 3_600_000);
    const cutoff180d = new Date(Date.now() - 180 * 24 * 3_600_000);

    const subs = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.is_active = true')
      .andWhere('s.last_activity_at < :cutoff', { cutoff: cutoff90d })
      .getMany();
    for (const sub of subs) {
      sub.isActive = false;
      await this.subscriptionRepo.save(sub);
    }

    const deleted = await this.historyRepo
      .createQueryBuilder()
      .delete()
      .where('sent_at < :cutoff', { cutoff: cutoff180d })
      .execute();

    const historyDeleted = deleted.affected ?? 0;
    if (subs.length > 0 || historyDeleted > 0) {
      this.logger.log(
        `Cleanup: ${subs.length} abonnement(s) desactive(s), ${historyDeleted} historique(s) supprime(s)`,
      );
    }
    return { subscriptionsDeactivated: subs.length, historyDeleted };
  }
}
