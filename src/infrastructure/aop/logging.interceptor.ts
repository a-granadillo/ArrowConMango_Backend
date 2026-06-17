import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * «AOP aspect» LoggingInterceptor (obligatorio según Guía §7).
 *
 * Logs HTTP method, route, status, and duration for every request.
 * Wraps the handler without the handler knowing it's being observed (OCP + Decorator pattern).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const { method, url } = req;
    const start = Date.now();

    this.logger.log(`IN  ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`OUT ${method} ${url} — ${ms}ms`);
        },
        error: (err: Error) => {
          const ms = Date.now() - start;
          this.logger.error(`ERR ${method} ${url} — ${ms}ms — ${err.message}`);
        },
      }),
    );
  }
}
