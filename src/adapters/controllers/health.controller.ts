import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Liveness probe. Deliberately does not touch the database — Render's
 * health check and the keep-alive cron only need to know the process is
 * up, not that Postgres is reachable (a slow/cold DB shouldn't flip the
 * service into "unhealthy" and get recycled).
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe (no auth, no DB access)' })
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
