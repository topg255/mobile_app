import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag?: string;
  data: Record<string, any>;
  actions: PushAction[];
  vibrate: number[] | null;
  requireInteraction: boolean;
  renotify: boolean;
}

export interface DeliveryResult {
  success: boolean;
  status?: number;
  error?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Couche bas niveau de l'envoi Web Push (VAPID).
 * Le stockage, la personnalisation et le smart content sont geres
 * par PushNotifierService.
 */
@Injectable()
export class PushWebPushService {
  private readonly logger = new Logger(PushWebPushService.name);
  private ready = false;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      'mailto:admin@leoni.local';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.ready = true;
    } else {
      this.logger.warn('VAPID keys manquantes — Web Push desactive');
    }
  }

  getVapidPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Envoie une notification a un abonnement. Retourne le resultat brut.
   * 404/410 => abonnement invalide (a nettoyer par l'appelant).
   */
  async send(
    subscription: StoredSubscription,
    payload: WebPushPayload,
    urgency: 'high' | 'normal' | 'low' = 'normal',
    ttl: number = 120,
  ): Promise<DeliveryResult> {
    if (!this.ready) {
      return { success: false, error: 'VAPID non configure' };
    }

    const options = {
      TTL: ttl,
      urgency,
      contentEncoding: 'aes128gcm' as const,
    };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      vibrate: payload.vibrate,
      requireInteraction: payload.requireInteraction,
      renotify: payload.renotify,
    });

    try {
      const res = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
        options,
      );
      return { success: true, status: res.statusCode };
    } catch (error: any) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        return { success: false, status, error: 'SubscriptionExpired' };
      }
      if (status === 429) {
        return { success: false, status, error: 'RateLimitExceeded' };
      }
      this.logger.warn(`Web push failed (${status}): ${error?.message}`);
      return {
        success: false,
        status,
        error: error?.message ?? 'UnknownError',
      };
    }
  }
}
