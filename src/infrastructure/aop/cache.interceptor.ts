import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

/**
 * «AOP aspect» CacheInterceptor — in-memory cache for GET /leaderboard.
 *
 * Caches leaderboard responses by levelId query param for TTL seconds.
 * Applied only to GET requests; mutation routes bypass it naturally.
 * The handler (GetLeaderboardUseCase) knows nothing about caching (OCP).
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Cache');
  private readonly store = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlSeconds = 30) {
    this.ttlMs = ttlSeconds * 1000;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; url: string }>();
    if (req.method !== 'GET') return next.handle();

    const key = req.url;
    const cached = this.store.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`HIT  ${key}`);
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
        this.logger.debug(`MISS ${key} — cached for ${this.ttlMs / 1000}s`);
      }),
    );
  }
}
