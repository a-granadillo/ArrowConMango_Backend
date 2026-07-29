import { User } from '../../domain/entities/user.entity';
import { IPasswordHasher } from '../../domain/ports/password-hasher';
import { ITokenService } from '../../domain/ports/token.service';
import { IUserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { GuestLoginInput, GuestLoginOutput } from '../dtos/auth.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GuestLoginUseCase
 *
 * Exchanges a client-generated UUID for a JWT, find-or-create style: the same
 * UUID always resolves to the same synthetic user (guest-<uuid>@guest.local),
 * so guest progress can be synced across app restarts without registration.
 */
export class GuestLoginUseCase implements UseCase<
  GuestLoginInput,
  GuestLoginOutput
> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: GuestLoginInput): Promise<GuestLoginOutput> {
    const email = Email.create(`guest-${input.uuid}@guest.local`);

    let user = await this.userRepo.byEmail(email);
    if (!user) {
      const passwordHash = await this.hasher.hash(input.uuid);
      const candidate = User.create(
        email,
        passwordHash,
        input.displayName ?? 'Guest',
      );
      try {
        await this.userRepo.save(candidate);
        user = candidate;
      } catch (err) {
        // Lost a find-or-create race to a concurrent guest-login for the
        // same uuid — e.g. the frontend's AuthInterceptor fires more than
        // one request before either has stored a token yet. The winner
        // already created the row; use it instead of failing the request.
        user = await this.userRepo.byEmail(email);
        if (!user) throw err;
      }
    }

    const token = this.tokenService.sign(user.id);
    return { token };
  }
}
