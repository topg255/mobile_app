import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyReport } from './entities/daily-report.entity';
import { ReportRecipient } from './entities/report-recipient.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { ControleDate } from '../quality/entities/controle-date.entity';
import { User } from '../auth/entities/user.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AiReportService } from './ai-report.service';
import { EmailService } from './email.service';
import { PdfService } from './pdf.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyReport, ReportRecipient, LigneControle, ControleDate, User]),
    ScheduleModule.forRoot(),
    NotificationModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, AiReportService, EmailService, PdfService],
  exports: [ReportService],
})
export class ReportModule {}
