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
  private senderEmail: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || null;
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || null;
    if (this.apiKey) {
      this.logger.log('Brevo API configured');
    } else {
      this.logger.warn('BREVO_API_KEY not set — emails will not be sent');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(`BREVO_API_KEY not configured — email to ${options.to} skipped`);
      return false;
    }

    if (!this.senderEmail) {
      this.logger.warn(`BREVO_SENDER_EMAIL not configured — email to ${options.to} skipped`);
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.senderEmail,
            name: 'LEONI Qualité IA',
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.warn(`Brevo API error (${response.status}): ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`Email sent to ${options.to}: ${data.messageId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${options.to} failed: ${error.message}`);
      return false;
    }
  }
}
