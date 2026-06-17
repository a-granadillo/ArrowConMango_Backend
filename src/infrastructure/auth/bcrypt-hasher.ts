import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../domain/ports/password-hasher';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<PasswordHash> {
    const raw = await bcrypt.hash(plainText, SALT_ROUNDS);
    return PasswordHash.fromHash(raw);
  }

  async compare(plainText: string, hash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(plainText, hash.hash);
  }
}
