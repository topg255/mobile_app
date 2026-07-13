import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendResetPasswordEmail(
    to: string,
    firstName: string,
    resetLink: string,
  ): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #2c3e50; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 30px; color: #333333; line-height: 1.6; }
          .button { display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; margin: 20px 0; }
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Réinitialisation du mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${firstName}</strong>,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            <p><strong>Ce lien expirera dans 15 minutes.</strong></p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          </div>
          <div class="footer">
            <p>Ce message est automatique, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Système Qualité" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject: 'Réinitialisation de votre mot de passe',
        html: htmlContent,
      });
      this.logger.log(`Email de réinitialisation envoyé à ${to}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email à ${to}`, error);
      throw error;
    }
  }
}
