import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Port (interface)» IUserRepository
 *
 * Defined in the domain so that use-cases depend on this abstraction (DIP).
 * Concrete implementation (TypeOrmUserRepository) lives in the infrastructure
 * layer and is injected at the composition root — the domain never imports it.
 */
export interface IUserRepository {
  byEmail(email: Email): Promise<User | null>;
  byId(id: UserId): Promise<User | null>;
  byIds(ids: UserId[]): Promise<User[]>;
  save(user: User): Promise<void>;
}
