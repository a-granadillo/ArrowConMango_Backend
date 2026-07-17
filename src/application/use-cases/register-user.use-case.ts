import { EmailAlreadyInUseError } from '../../domain/errors/domain-error';
import { User } from '../../domain/entities/user.entity';
import { IPasswordHasher } from '../../domain/ports/password-hasher';
import { ITokenService } from '../../domain/ports/token.service';
import { IUserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { RegisterInput, RegisterOutput } from '../dtos/auth.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» RegisterUserUseCase
 *
 * Orchestrates user registration: validates uniqueness, hashes password,
 * persists, and signs a token — so registering leaves the caller logged in
 * immediately, the same as login/guest, instead of requiring a follow-up
 * POST /auth/login call.
 * Depends only on IUserRepository, IPasswordHasher and ITokenService
 * interfaces (DIP). Never imports TypeORM, bcrypt, or HTTP concerns.
 */
export class RegisterUserUseCase implements UseCase<
  RegisterInput,
  RegisterOutput
> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const email = Email.create(input.email);

    const existing = await this.userRepo.byEmail(email);
    if (existing) {
      throw new EmailAlreadyInUseError(input.email);
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create(email, passwordHash, input.username);

    await this.userRepo.save(user);

    return {
      id: user.id.value,
      email: user.email.value,
      username: user.username,
      token: this.tokenService.sign(user.id),
    };
  }
}
