import { UserNotFoundError } from '../../domain/errors/domain-error';
import { IUserRepository } from '../../domain/ports/user.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  UpdatePlayerNameInput,
  UpdatePlayerNameOutput,
} from '../dtos/auth.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» UpdatePlayerNameUseCase
 *
 * Renames an authenticated player. The AuthGuard (AOP, NestJS layer)
 * ensures only the token's own user reaches this — there is no "rename
 * anyone" path.
 */
export class UpdatePlayerNameUseCase implements UseCase<
  UpdatePlayerNameInput,
  UpdatePlayerNameOutput
> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: UpdatePlayerNameInput): Promise<UpdatePlayerNameOutput> {
    const userId = UserId.create(input.userId);
    const user = await this.userRepo.byId(userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    user.rename(input.displayName);
    await this.userRepo.save(user);

    return {
      id: user.id.value,
      email: user.email.value,
      username: user.username,
    };
  }
}
