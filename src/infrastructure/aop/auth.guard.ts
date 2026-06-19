import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ITokenService } from '../../domain/ports/token.service';
import { UnauthorizedError } from '../../domain/errors/domain-error';
import { TOKEN_SERVICE } from '../config/tokens';

/**
 * «AOP aspect» AuthGuard — JWT verification before protected endpoints (D5).
 *
 * Extracts the Bearer token from Authorization header, verifies via ITokenService,
 * and attaches userId to the request. Controllers read it via @CurrentUser().
 * The use-case receives userId as a plain string — it never sees this guard (LSP).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      userId?: string;
    }>();

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7);
    const userId = this.tokenService.verify(token);
    req.userId = userId.value;
    return true;
  }
}
