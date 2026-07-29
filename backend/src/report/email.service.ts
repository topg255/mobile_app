import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      this.logger.warn(`SMTP not configured — email to ${options.to} skipped (report saved without email)`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"LEONI Qualité IA" <${smtpUser}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${options.to} failed: ${error.message} — report still saved`);
      return false;
    }
  }
}
