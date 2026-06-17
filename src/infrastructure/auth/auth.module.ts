import { Module } from '@nestjs/common';
import { PASSWORD_HASHER, TOKEN_SERVICE } from '../config/tokens';
import { BcryptHasher } from './bcrypt-hasher';
import { JwtTokenService } from './jwt-token.service';

@Module({
  providers: [
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: PASSWORD_HASHER, useClass: BcryptHasher },
  ],
  exports: [TOKEN_SERVICE, PASSWORD_HASHER],
})
export class AuthModule {}
