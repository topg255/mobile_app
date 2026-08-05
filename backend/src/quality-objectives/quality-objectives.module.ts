import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityObjective } from './entities/quality-objective.entity';
import { ObjectiveBadge } from './entities/objective-badge.entity';
import { ObjectiveHistory } from './entities/objective-history.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { User } from '../auth/entities/user.entity';
import { QualityObjectivesService } from './quality-objectives.service';
import { QualityObjectivesController } from './quality-objectives.controller';
import { ObjectiveMetricsService } from './objective.metrics.service';
import { ObjectivePredictionService } from './objective.prediction.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityObjective,
      ObjectiveBadge,
      ObjectiveHistory,
      LigneControle,
      User,
    ]),
    NotificationModule,
  ],
  controllers: [QualityObjectivesController],
  providers: [
    QualityObjectivesService,
    ObjectiveMetricsService,
    ObjectivePredictionService,
  ],
  exports: [QualityObjectivesService],
})
export class QualityObjectivesModule {}
