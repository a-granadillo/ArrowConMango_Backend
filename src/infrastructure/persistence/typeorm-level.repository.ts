import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { LevelDefinitionOrmEntity } from '../../infrastructure/orm/level.orm-entity';
import { LevelMapper } from './level.mapper';

@Injectable()
export class TypeOrmLevelRepository implements ILevelRepository {
  constructor(
    @InjectRepository(LevelDefinitionOrmEntity)
    private readonly repo: Repository<LevelDefinitionOrmEntity>,
  ) {}

  async getAll(): Promise<LevelDefinition[]> {
    const orms = await this.repo.find();
    return orms.map(LevelMapper.toDomain);
  }

  async getById(id: LevelId): Promise<LevelDefinition | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? LevelMapper.toDomain(orm) : null;
  }

  async upsert(level: LevelDefinition): Promise<void> {
    await this.repo.save(LevelMapper.toOrm(level));
  }
}
