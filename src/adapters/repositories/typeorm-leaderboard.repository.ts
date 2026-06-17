import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreEntry } from '../../domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { ScoreEntryOrmEntity } from '../../infrastructure/orm/score-entry.orm-entity';
import { ScoreEntryMapper } from '../mappers/score-entry.mapper';

@Injectable()
export class TypeOrmLeaderboardRepository implements ILeaderboardRepository {
  constructor(
    @InjectRepository(ScoreEntryOrmEntity)
    private readonly repo: Repository<ScoreEntryOrmEntity>,
  ) {}

  async top(levelId: LevelId, n = 10): Promise<ScoreEntry[]> {
    const orms = await this.repo.find({
      where: { levelId: levelId.value },
      order: {
        moves: 'ASC',
        timeMs: 'ASC',
      },
      take: n,
    });
    return orms.map(ScoreEntryMapper.toDomain);
  }

  async add(entry: ScoreEntry): Promise<void> {
    await this.repo.save(ScoreEntryMapper.toOrm(entry));
  }
}
