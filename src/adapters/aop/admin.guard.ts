import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminRequiredError } from '../../domain/errors/domain-error';

/**
 * «AOP aspect» AdminGuard — restricts an endpoint to a fixed allowlist of
 * user ids, configured via the `ADMIN_USER_IDS` env var (comma-separated).
 *
 * Must run after [AuthGuard] (`@UseGuards(AuthGuard, AdminGuard)`), which is
 * what populates `req.userId`. Protects the campaign/hex catalogue from
 * being overwritten by an arbitrary authenticated (including guest) user —
 * see `LevelController.upsert` (`PUT /levels/:id`).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ userId?: string }>();

    if (!req.userId || !AdminGuard.adminIds().has(req.userId)) {
      throw new AdminRequiredError('modify a level definition');
    }
    return true;
  }

  private static adminIds(): Set<string> {
    return new Set(
      (process.env['ADMIN_USER_IDS'] ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }
}

/** True when [userId] is on the `ADMIN_USER_IDS` allowlist. */
export function isAdminUserId(userId: string): boolean {
  return new Set(
    (process.env['ADMIN_USER_IDS'] ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  ).has(userId);
}
