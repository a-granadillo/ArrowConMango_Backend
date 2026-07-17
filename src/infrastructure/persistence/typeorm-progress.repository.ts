import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PlayerProgressOrmEntity } from '../../infrastructure/orm/progress.orm-entity';
import { ProgressMapper } from './progress.mapper';

@Injectable()
export class TypeOrmProgressRepository implements IProgressRepository {
  constructor(
    @InjectRepository(PlayerProgressOrmEntity)
    private readonly repo: Repository<PlayerProgressOrmEntity>,
  ) {}

  async byUser(userId: UserId): Promise<PlayerProgress | null> {
    const orm = await this.repo.findOne({ where: { userId: userId.value } });
    return orm ? ProgressMapper.toDomain(orm) : null;
  }

  async save(progress: PlayerProgress): Promise<void> {
    const orm = ProgressMapper.toOrm(progress);
    await this.repo.save(orm);
  }

  async all(): Promise<PlayerProgress[]> {
    const orms = await this.repo.find();
    return orms.map(ProgressMapper.toDomain);
  }
}
