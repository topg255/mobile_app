import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureAudit } from './entities/signature-audit.entity';
import { DailyReport } from '../report/entities/daily-report.entity';
import { User } from '../auth/entities/user.entity';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { ReportService } from '../report/report.service';
import { ReportRecipient } from '../report/entities/report-recipient.entity';
import { AiReportService } from '../report/ai-report.service';
import { EmailService } from '../report/email.service';
import { PdfService } from '../report/pdf.service';
import { NotificationModule } from '../notification/notification.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SignatureAudit,
      DailyReport,
      User,
      ReportRecipient,
    ]),
    NotificationModule,
    PushNotificationModule,
  ],
  controllers: [SignatureController],
  providers: [
    SignatureService,
    ReportService,
    AiReportService,
    EmailService,
    PdfService,
  ],
  exports: [SignatureService],
})
export class SignatureModule {}
