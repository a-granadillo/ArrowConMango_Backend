import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { UserOrmEntity } from '../../infrastructure/orm/user.orm-entity';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute(
      UserId.create(orm.id),
      Email.create(orm.email),
      PasswordHash.fromHash(orm.passwordHash),
      orm.username,
    );
  }

  static toOrm(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = user.id.value;
    orm.email = user.email.value;
    orm.passwordHash = user.pass.hash;
    orm.username = user.username;
    return orm;
  }
}
