import { InvalidCredentialsError } from '../../domain/errors/domain-error';
import { IPasswordHasher } from '../../domain/ports/password-hasher';
import { ITokenService } from '../../domain/ports/token.service';
import { IUserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { LoginInput, LoginOutput } from '../dtos/auth.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» LoginUseCase
 *
 * Validates credentials and issues a JWT via ITokenService (DIP).
 * Throws typed domain errors (no HTTP status codes here).
 */
export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const email = Email.create(input.email);

    const user = await this.userRepo.byEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const valid = await user.verify(input.password, this.hasher);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const token = this.tokenService.sign(user.id);
    return { token };
  }
}
