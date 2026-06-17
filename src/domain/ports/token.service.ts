import { UserId } from '../value-objects/user-id.vo';

/**
 * «Port (interface)» ITokenService
 *
 * Abstracts JWT signing/verification so that LoginUseCase never imports
 * jsonwebtoken or @nestjs/jwt (DIP). The adapter JwtTokenService lives in
 * the infrastructure layer.
 */
export interface ITokenService {
  sign(userId: UserId): string;
  verify(token: string): UserId;
}
