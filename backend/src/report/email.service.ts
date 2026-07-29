import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiKey: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY') || null;
    if (this.apiKey) {
      this.logger.log('Resend API configured');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will not be sent');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey || this.apiKey === 're_YOUR_KEY_HERE') {
      this.logger.warn(`Resend API key not configured — email to ${options.to} skipped`);
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LEONI Qualité IA <onboarding@resend.dev>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.warn(`Resend API error (${response.status}): ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`Email sent to ${options.to}: ${data.id}`);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${options.to} failed: ${error.message}`);
      return false;
    }
  }
}
