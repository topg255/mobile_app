import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { DailyReport, ReportStatus } from './entities/daily-report.entity';
import { ReportRecipient } from './entities/report-recipient.entity';
import { AiReportService } from './ai-report.service';
import { EmailService } from './email.service';
import { PdfService } from './pdf.service';
import { buildReportEmailHtml } from './templates/report-email.template';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { PushNotifierService } from '../push-notification/push-notifier.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(DailyReport)
    private readonly reportRepo: Repository<DailyReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ReportRecipient)
    private readonly recipientRepo: Repository<ReportRecipient>,
    private readonly aiReportService: AiReportService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
    private readonly notificationService: NotificationService,
    private readonly pushNotifier: PushNotifierService,
  ) {}

  @Cron('0 18 * * *')
  async handleDailyReport() {
    this.logger.log('=== Daily AI Report Generation Started (18:00) ===');
    try {
      await this.generateAndSendReports(new Date());
    } catch (error) {
      this.logger.error(`Daily report generation failed: ${error.message}`);
    }
    this.logger.log('=== Daily AI Report Generation Completed ===');
  }

  async generateAndSendReports(targetDate?: Date): Promise<DailyReport[]> {
    const date = targetDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    const superviseurs = await this.userRepo.find({
      where: { role: UserRole.SUPERVISEUR_QUALITE, isApproved: true },
    });

    if (superviseurs.length === 0) {
      this.logger.warn(
        'No approved superviseurs found — skipping report generation',
      );
      return [];
    }

    const reports: DailyReport[] = [];

    for (const superviseur of superviseurs) {
      try {
        const report = await this.generateSingleReport(
          superviseur,
          date,
          dateStr,
        );
        reports.push(report);
      } catch (error) {
        this.logger.error(
          `Failed to generate report for ${superviseur.email}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Generated ${reports.length} report(s) for ${dateStr}`);
    return reports;
  }

  async generateSingleReport(
    superviseur: User,
    targetDate: Date,
    dateStr: string,
  ): Promise<DailyReport> {
    const superviseurName = `${superviseur.firstName} ${superviseur.lastName}`;
    this.logger.log(`Generating report for ${superviseurName}...`);

    const generated = await this.aiReportService.generateReport(
      targetDate,
      superviseurName,
    );

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
    this.logger.log(
      `Report generated for ${superviseurName} — sending email with PDF...`,
    );

    const recipients = await this.recipientRepo.find({
      where: { superviseurId: superviseur.id },
      order: { createdAt: 'ASC' },
    });
    const extraEmails = recipients.map((r) => r.email);
    const allEmails = [superviseur.email, ...extraEmails];

    const emailSent = await this.sendReportEmail(
      report,
      superviseur,
      superviseurName,
      targetDate,
      extraEmails,
    );

    if (emailSent) {
      report.status = ReportStatus.SENT;
      report.emailSentAt = new Date();
      report.emailRecipient = allEmails.join(', ');
      await this.reportRepo.save(report);

      await this.notificationService.create(
        superviseur.id,
        NotificationType.REPORT_GENERATED,
        `Rapport qualite du ${targetDate.toLocaleDateString('fr-FR')} genere et envoye a ${allEmails.join(', ')}`,
        report.id,
      );
    } else {
      report.status = ReportStatus.GENERATED;
      report.emailRecipient = allEmails.join(', ');
      report.errorMessage =
        'Email non envoye — SMTP non configure ou inaccessible';
      await this.reportRepo.save(report);

      await this.notificationService.create(
        superviseur.id,
        NotificationType.REPORT_GENERATED,
        `Rapport qualite du ${targetDate.toLocaleDateString('fr-FR')} genere. Email en attente de configuration SMTP.`,
        report.id,
      );
    }

    await this.pushNotifier.notifyAiReport(
      superviseur.id,
      superviseurName,
      {
        totalLignes: generated.kpis.totalLignes,
        rougeCount: generated.kpis.rougeCount,
        rougePercent: generated.kpis.rougePercent,
        vertPercent: generated.kpis.vertPercent,
      },
      report.id,
    );

    return report;
  }

  async manualGenerate(targetDate?: string): Promise<DailyReport[]> {
    const date = targetDate ? new Date(targetDate) : new Date();
    this.logger.log(
      `Manual report generation triggered for ${date.toISOString()}`,
    );
    return this.generateAndSendReports(date);
  }

  async getRecipients(user: User) {
    if (user.role === UserRole.SUPERVISEUR_QUALITE) {
      return this.recipientRepo.find({
        where: { superviseurId: user.id },
        order: { createdAt: 'ASC' },
      });
    }
    return this.recipientRepo.find({
      relations: { superviseur: true },
      order: { createdAt: 'DESC' },
    });
  }

  async addRecipient(user: User, email: string, superviseurId?: string) {
    const normalized = email.trim().toLowerCase();

    if (
      user.role === UserRole.SUPERVISEUR_QUALITE &&
      superviseurId &&
      superviseurId !== user.id
    ) {
      throw new ForbiddenException('Non autorise');
    }

    const ownerId = superviseurId || user.id;
    const owner = await this.userRepo.findOne({
      where: { id: ownerId, role: UserRole.SUPERVISEUR_QUALITE },
    });
    if (!owner) throw new NotFoundException('Superviseur non trouve');

    if (normalized === owner.email.toLowerCase()) {
      throw new BadRequestException(
        'Le superviseur recoit deja le rapport sur son adresse email principale',
      );
    }

    const existing = await this.recipientRepo.findOne({
      where: { superviseurId: ownerId, email: normalized },
    });
    if (existing) {
      throw new ConflictException(
        'Cet email est deja un destinataire du rapport',
      );
    }

    const recipient = this.recipientRepo.create({
      superviseurId: ownerId,
      email: normalized,
    });
    return this.recipientRepo.save(recipient);
  }

  async removeRecipient(id: string, user: User) {
    const recipient = await this.recipientRepo.findOne({ where: { id } });
    if (!recipient) throw new NotFoundException('Destinataire non trouve');
    if (
      user.role === UserRole.SUPERVISEUR_QUALITE &&
      recipient.superviseurId !== user.id
    ) {
      throw new ForbiddenException('Non autorise');
    }
    await this.recipientRepo.remove(recipient);
    return { message: 'Destinataire supprime avec succes' };
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Rapport non trouve');
    await this.reportRepo.remove(report);
  }

  async getReports(superviseurId?: string, page = 1, limit = 20) {
    const qb = this.reportRepo
      .createQueryBuilder('report')
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
    const sent = await this.reportRepo.count({
      where: { status: ReportStatus.SENT },
    });
    const failed = await this.reportRepo.count({
      where: { status: ReportStatus.FAILED },
    });
    return { total, sent, failed };
  }

  async downloadReportPdf(id: string): Promise<Buffer> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: { superviseur: true },
    });
    if (!report) throw new NotFoundException('Rapport non trouve');

    const superviseurName = `${report.superviseur.firstName} ${report.superviseur.lastName}`;
    const targetDate = new Date(report.reportDate);
    const dateFormatted = targetDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const refParts = this.buildReferenceParts(report);
    const reference = await this.generateReference(refParts);

    return this.pdfService.generatePdf({
      superviseurName,
      superviseurMatricule: report.superviseur.matricule,
      dateFormatted,
      reference,
      ligneName: refParts.ligne,
      agentName: refParts.agent,
      kpis: report.kpis,
      aiAnalysis: report.aiAnalysis || '',
      recommendations: report.recommendations || '',
      summary: report.summary,
    });
  }

  private buildReferenceParts(report: DailyReport): {
    ligne: string;
    agent: string;
    number: number;
  } {
    const kpis = report.kpis as any;
    let ligne = 'GEN';
    let agent = 'GEN';

    if (kpis.criticalLignes && kpis.criticalLignes.length > 0) {
      ligne = kpis.criticalLignes[0].nom || 'GEN';
    } else if (kpis.hourlyBreakdown && kpis.hourlyBreakdown.length > 0) {
      ligne = 'ACTIF';
    }

    if (kpis.topAgent && kpis.topAgent !== 'Aucun') {
      agent = kpis.topAgent;
    }

    const number = (this.reportRepo as any).totalCount || 0;

    return { ligne, agent, number };
  }

  private async generateReference(refParts: {
    ligne: string;
    agent: string;
    number: number;
  }): Promise<string> {
    const count = await this.reportRepo.count();
    const num = String(count + 1).padStart(3, '0');
    const ligneClean = refParts.ligne
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 10)
      .toUpperCase();
    const agentClean = refParts.agent
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 10)
      .toUpperCase();
    return `REF-LEONI-${ligneClean}-${agentClean}-${num}`;
  }

  private async sendReportEmail(
    report: DailyReport,
    superviseur: User,
    superviseurName: string,
    targetDate: Date,
    extraRecipients: string[] = [],
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

    let pdfBuffer: Buffer | undefined;
    try {
      const refParts = this.buildReferenceParts(report);
      const reference = await this.generateReference(refParts);
      pdfBuffer = await this.pdfService.generatePdf({
        superviseurName,
        superviseurMatricule: superviseur.matricule,
        dateFormatted,
        reference,
        ligneName: refParts.ligne,
        agentName: refParts.agent,
        kpis: report.kpis,
        aiAnalysis: report.aiAnalysis || '',
        recommendations: report.recommendations || '',
        summary: report.summary,
      });
    } catch (e) {
      this.logger.warn(
        `PDF generation failed: ${e.message} — sending email without attachment`,
      );
    }

    return this.sendEmailWithRetry(
      {
        to: superviseur.email,
        cc: extraRecipients.length > 0 ? extraRecipients : undefined,
        subject: `Rapport Qualite IA — ${dateFormatted}`,
        html,
        pdfBuffer,
        pdfFilename: `rapport-qualite-${report.reportDate}.pdf`,
      },
      3,
    );
  }

  private async sendEmailWithRetry(
    options: any,
    retries: number,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const sent = await this.emailService.sendEmail(options);
        if (sent) return true;
        this.logger.warn(
          `Email attempt ${attempt}/${retries} failed — retrying in ${attempt * 5}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      } catch (error) {
        this.logger.warn(
          `Email attempt ${attempt}/${retries} error: ${error.message}`,
        );
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        }
      }
    }
    this.logger.error(
      `Email to ${options.to} failed after ${retries} attempts`,
    );
    return false;
  }
}
