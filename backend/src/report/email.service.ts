import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { ReportKPIs } from './ai-report.service';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log('Gmail SMTP configured');
    } else {
      this.logger.warn('GMAIL_USER / GMAIL_PASS not set — emails will not be sent');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Gmail SMTP not configured — email to ${options.to} skipped`);
      return false;
    }

    try {
      const mailOptions: any = {
        from: `"LEONI Qualite IA" <${this.configService.get<string>('GMAIL_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      if (options.pdfBuffer) {
        mailOptions.attachments = [{
          filename: options.pdfFilename || 'rapport-qualite.pdf',
          content: options.pdfBuffer,
          contentType: 'application/pdf',
        }];
      }

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${options.to} failed: ${error.message}`);
      return false;
    }
  }

  generatePdf(params: {
    superviseurName: string;
    dateFormatted: string;
    kpis: ReportKPIs;
    aiAnalysis: string;
    recommendations: string;
    summary: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const leoniLogoPath = join(process.cwd(), '..', 'front', 'public', 'leoni-logo.svg');
      const leoniLogoPathPng = join(process.cwd(), '..', 'front', 'public', 'leoni-logo.png');
      const fiveSPath = join(process.cwd(), '..', 'front', 'public', '5s.jpeg');

      // Header bar
      doc.rect(0, 0, 595.28, 80).fill('#1e293b');

      // 5S logo (left)
      try {
        if (existsSync(fiveSPath)) {
          doc.image(fiveSPath, 40, 18, { width: 44, height: 44 });
        }
      } catch {}

      // LEONI logo (right)
      try {
        if (existsSync(leoniLogoPathPng)) {
          doc.image(leoniLogoPathPng, 500, 18, { width: 55, height: 44 });
        } else if (existsSync(leoniLogoPath)) {
          doc.image(leoniLogoPath, 500, 18, { width: 55, height: 44 });
        }
      } catch {}

      // Header text
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff');
      doc.text('RAPPORT QUALITE QUOTIDIEN', 100, 25, { width: 350, align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#94a3b8');
      doc.text(params.dateFormatted, 100, 48, { width: 350, align: 'center' });

      let y = 100;

      // Summary
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
      doc.text('RESUME', 50, y);
      y += 20;
      doc.font('Helvetica').fontSize(10).fillColor('#475569');
      doc.text(params.summary, 50, y, { width: 495 });
      y += doc.heightOfString(params.summary, { width: 495 }) + 20;

      // KPI Cards
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
      doc.text('INDICATEURS CLES', 50, y);
      y += 25;

      const kpiCards = [
        { label: 'Conformes', value: `${params.kpis.vertCount}`, sub: `${params.kpis.vertPercent}%`, color: '#16a34a', bg: '#f0fdf4' },
        { label: 'A surveiller', value: `${params.kpis.jauneCount}`, sub: `${params.kpis.jaunePercent}%`, color: '#ca8a04', bg: '#fefce8' },
        { label: 'Critiques', value: `${params.kpis.rougeCount}`, sub: `${params.kpis.rougePercent}%`, color: '#dc2626', bg: '#fef2f2' },
        { label: 'Arret (min)', value: `${params.kpis.totalMinutes}`, sub: `${params.kpis.totalLignes} lignes`, color: '#2563eb', bg: '#eff6ff' },
      ];

      const cardWidth = 118;
      const cardGap = 7;
      kpiCards.forEach((card, i) => {
        const cx = 50 + i * (cardWidth + cardGap);
        doc.roundedRect(cx, y, cardWidth, 60, 6).fill(card.bg);
        doc.font('Helvetica-Bold').fontSize(22).fillColor(card.color);
        doc.text(card.value, cx, y + 10, { width: cardWidth, align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor(card.color);
        doc.text(card.sub, cx, y + 36, { width: cardWidth, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(7).fillColor(card.color);
        doc.text(card.label.toUpperCase(), cx, y + 48, { width: cardWidth, align: 'center' });
      });
      y += 80;

      // Separator
      doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor('#e2e8f0').stroke();
      y += 15;

      // AI Analysis
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
      doc.text('ANALYSE IA', 50, y);
      y += 20;
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      const analysisLines = params.aiAnalysis.split('\n');
      analysisLines.forEach((line) => {
        if (y > 750) { doc.addPage(); y = 50; }
        if (line.startsWith('- ')) {
          doc.text('  ' + line, 60, y, { width: 475 });
        } else if (line === '') {
          y += 8;
        } else {
          doc.text(line, 50, y, { width: 495 });
        }
        y += doc.heightOfString(line || ' ', { width: 495 }) + 4;
      });
      y += 10;

      // Separator
      if (y > 720) { doc.addPage(); y = 50; }
      doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor('#e2e8f0').stroke();
      y += 15;

      // Recommendations
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
      doc.text('RECOMMANDATIONS', 50, y);
      y += 20;
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      const recLines = params.recommendations.split('\n');
      recLines.forEach((line) => {
        if (y > 750) { doc.addPage(); y = 50; }
        if (line.startsWith('[URGENT]')) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#dc2626');
          doc.text(line, 60, y, { width: 475 });
        } else if (line.startsWith('[OK]')) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#16a34a');
          doc.text(line, 60, y, { width: 475 });
        } else {
          doc.font('Helvetica').fontSize(9).fillColor('#475569');
          doc.text(line, 60, y, { width: 475 });
        }
        y += doc.heightOfString(line, { width: 475 }) + 4;
      });

      // Top Agent
      if (params.kpis.topAgent !== 'Aucun') {
        y += 15;
        if (y > 720) { doc.addPage(); y = 50; }
        doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor('#e2e8f0').stroke();
        y += 15;
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
        doc.text('TOP AGENT', 50, y);
        y += 20;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#15803d');
        doc.text(params.kpis.topAgent, 60, y);
        y += 15;
        doc.font('Helvetica').fontSize(9).fillColor('#64748b');
        doc.text('Agent le plus actif du jour', 60, y);
      }

      // Footer
      const footerY = 780;
      doc.moveTo(50, footerY).lineTo(545, footerY).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
      doc.text('Rapport genere automatiquement — LEONI Qualite IA', 50, footerY + 8, { width: 495, align: 'center' });
      doc.text(params.dateFormatted, 50, footerY + 20, { width: 495, align: 'center' });

      doc.end();
    });
  }
}
