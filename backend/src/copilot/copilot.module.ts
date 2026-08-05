import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { User } from '../auth/entities/user.entity';
import { DailyReport } from '../report/entities/daily-report.entity';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LigneControle, User, DailyReport])],
  controllers: [CopilotController],
  providers: [CopilotService],
  exports: [CopilotService],
})
export class CopilotModule {}
