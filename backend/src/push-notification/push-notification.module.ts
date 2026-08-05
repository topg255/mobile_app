import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushNotificationHistory } from './entities/push-notification-history.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationAnalytics } from './entities/notification-analytics.entity';
import { PushSystemConfig } from './entities/push-system-config.entity';
import { User } from '../auth/entities/user.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { QualityObjective } from '../quality-objectives/entities/quality-objective.entity';
import { NotificationModule } from '../notification/notification.module';
import { PushNotifierService } from './push-notifier.service';
import { PushWebPushService } from './push-webpush.service';
import { PushEscalationService } from './push-escalation.service';
import { PushNotificationController } from './push-notification.controller';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushNotificationHistory,
      PushSubscription,
      NotificationPreferences,
      NotificationAnalytics,
      PushSystemConfig,
      User,
      LigneControle,
      QualityObjective,
    ]),
    NotificationModule,
  ],
  controllers: [PushNotificationController],
  providers: [
    PushNotifierService,
    PushWebPushService,
    PushEscalationService,
    RateLimitGuard,
  ],
  exports: [PushNotifierService, PushEscalationService],
})
export class PushNotificationModule {}
