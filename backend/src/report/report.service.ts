import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { DailyReport, ReportStatus } from './entities/daily-report.entity';
import { AiReportService } from './ai-report.service';
import { EmailService } from './email.service';
import { buildReportEmailHtml } from './templates/report-email.template';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { User, UserRole } from '../auth/entities/user.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(DailyReport)
    private readonly reportRepo: Repository<DailyReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly aiReportService: AiReportService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 18 * * *')
  async handleDailyReport() {
    this.logger.log('=== Daily AI Report Generation Started ===');
    await this.generateAndSendReports(new Date());
    this.logger.log('=== Daily AI Report Generation Completed ===');
  }

  async generateAndSendReports(targetDate?: Date): Promise<DailyReport[]> {
    const date = targetDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    const superviseurs = await this.userRepo.find({
      where: { role: UserRole.SUPERVISEUR_QUALITE, isApproved: true },
    });

    if (superviseurs.length === 0) {
      this.logger.warn('No approved superviseurs found — skipping report generation');
      return [];
    }

    const reports: DailyReport[] = [];

    for (const superviseur of superviseurs) {
      try {
        const report = await this.generateSingleReport(superviseur, date, dateStr);
        reports.push(report);
      } catch (error) {
        this.logger.error(`Failed to generate report for ${superviseur.email}: ${error.message}`);
      }
    }

    this.logger.log(`Generated ${reports.length} report(s) for ${dateStr}`);
    return reports;
  }

  async generateSingleReport(superviseur: User, targetDate: Date, dateStr: string): Promise<DailyReport> {
    const superviseurName = `${superviseur.firstName} ${superviseur.lastName}`;
    this.logger.log(`Generating report for ${superviseurName}...`);

    const generated = await this.aiReportService.generateReport(targetDate, superviseurName);

    let report = await this.reportRepo.findOne({
      where: { superviseur: { id: superviseur.id }, reportDate: dateStr },
    });

    if (report) {
      report.summary = generated.summary;
      report.kpis = generated.kpis;
      report.aiAnalysis = generated.aiAnalysis;
      report.recommendations = generated.recommendations;
      report.status = ReportStatus.GENERATED;
      report.emailSentAt = null;
      report.errorMessage = null;
    } else {
      report = this.reportRepo.create({
        superviseur,
        reportDate: dateStr,
        summary: generated.summary,
        kpis: generated.kpis,
        aiAnalysis: generated.aiAnalysis,
        recommendations: generated.recommendations,
        status: ReportStatus.GENERATED,
      });
    }

    await this.reportRepo.save(report);
    this.logger.log(`Report generated for ${superviseurName} — sending email...`);

    const emailSent = await this.sendReportEmail(report, superviseur, superviseurName, targetDate);

    if (emailSent) {
      report.status = ReportStatus.SENT;
      report.emailSentAt = new Date();
      report.emailRecipient = superviseur.email;
      await this.reportRepo.save(report);

      await this.notificationService.create(
        superviseur.id,
        NotificationType.REPORT_GENERATED,
        `📋 Votre rapport qualité du ${targetDate.toLocaleDateString('fr-FR')} a été généré et envoyé à ${superviseur.email}`,
        report.id,
      );
    } else {
      report.status = ReportStatus.FAILED;
      report.errorMessage = 'Email delivery failed — SMTP not configured or unreachable';
      await this.reportRepo.save(report);
    }

    return report;
  }

  async manualGenerate(targetDate?: string): Promise<DailyReport[]> {
    const date = targetDate ? new Date(targetDate) : new Date();
    this.logger.log(`Manual report generation triggered for ${date.toISOString()}`);
    return this.generateAndSendReports(date);
  }

  async getReports(superviseurId?: string, page = 1, limit = 20) {
    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.superviseur', 'superviseur')
      .orderBy('report.reportDate', 'DESC')
      .addOrderBy('report.created_at', 'DESC');

    if (superviseurId) {
      qb.where('superviseur.id = :superviseurId', { superviseurId });
    }

    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getReportById(id: string) {
    return this.reportRepo.findOne({
      where: { id },
      relations: { superviseur: true },
    });
  }

  async getReportStats() {
    const total = await this.reportRepo.count();
    const sent = await this.reportRepo.count({ where: { status: ReportStatus.SENT } });
    const failed = await this.reportRepo.count({ where: { status: ReportStatus.FAILED } });
    return { total, sent, failed };
  }

  private async sendReportEmail(
    report: DailyReport,
    superviseur: User,
    superviseurName: string,
    targetDate: Date,
  ): Promise<boolean> {
    const dateFormatted = targetDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = buildReportEmailHtml({
      superviseurName,
      dateFormatted,
      kpis: report.kpis,
      aiAnalysis: report.aiAnalysis || '',
      recommendations: report.recommendations || '',
      summary: report.summary,
    });

    return this.emailService.sendEmail({
      to: superviseur.email,
      subject: `📋 Rapport Qualité IA — ${dateFormatted}`,
      html,
    });
  }
}
