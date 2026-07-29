import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend API initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will not be sent');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not configured — email to ${options.to} skipped`);
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'LEONI Qualité IA <onboarding@resend.dev>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.warn(`Resend error for ${options.to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${options.to}: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${options.to} failed: ${error.message}`);
      return false;
    }
  }
}
