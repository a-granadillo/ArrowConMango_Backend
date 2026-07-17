import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../domain/errors/domain-error';
import { ITokenService } from '../../domain/ports/token.service';
import { UserId } from '../../domain/value-objects/user-id.vo';

@Injectable()
export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(private readonly cfg: ConfigService) {
    this.secret = this.cfg.get<string>('app.jwtSecret', { infer: true })!;
    this.expiresIn = this.cfg.get<string>('app.jwtExpiresIn', { infer: true })!;
  }

  sign(userId: UserId): string {
    return jwt.sign({ sub: userId.value }, this.secret, {
      expiresIn: this.expiresIn,
    } as jwt.SignOptions);
  }

  verify(token: string): UserId {
    try {
      const payload = jwt.verify(token, this.secret) as jwt.JwtPayload;
      return UserId.create(payload['sub'] as string);
    } catch {
      throw new UnauthorizedError();
    }
  }
}
