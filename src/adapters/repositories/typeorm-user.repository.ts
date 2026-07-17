import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { UserOrmEntity } from '../../infrastructure/orm/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async byEmail(email: Email): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { email: email.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async byId(id: UserId): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async byIds(ids: UserId[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const orms = await this.repo.find({
      where: { id: In(ids.map((id) => id.value)) },
    });
    return orms.map(UserMapper.toDomain);
  }

  async save(user: User): Promise<void> {
    await this.repo.save(UserMapper.toOrm(user));
  }
}
