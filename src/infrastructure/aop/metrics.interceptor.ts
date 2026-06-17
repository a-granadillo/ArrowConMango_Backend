import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const SLOW_THRESHOLD_MS = 200;

/**
 * «AOP aspect» MetricsInterceptor (RNF-01: leaderboard < 100 ms).
 *
 * Measures handler duration and emits a warning when it exceeds the threshold.
 * Applied globally; the handler itself knows nothing about this measurement.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Metrics');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const handlerName = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        if (ms > SLOW_THRESHOLD_MS) {
          this.logger.warn(`SLOW [${handlerName}] ${ms}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`);
        } else {
          this.logger.debug(`[${handlerName}] ${ms}ms`);
        }
      }),
    );
  }
}
