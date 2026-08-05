import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter memoire (fenetre glissante simple).
 * Prevention des abus sur les endpoints critiques (subscribe/send/status).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly limit: number = 30,
    private readonly windowMs: number = 60_000,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.keyFor(request);
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > this.limit) {
      throw new HttpException(
        'Trop de requetes. Veuillez reessayer plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.buckets.size > 5000) {
      const keysToDrop: string[] = [];
      for (const [k, b] of this.buckets) {
        if (b.resetAt <= now) keysToDrop.push(k);
      }
      keysToDrop.forEach((k) => this.buckets.delete(k));
    }

    return true;
  }

  private keyFor(request: any): string {
    const userId = request.user?.id;
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const route = request.route?.path ?? request.url ?? 'unknown';
    return `${route}:${userId ?? ip}`;
  }
}
