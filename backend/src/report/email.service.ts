import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
}
