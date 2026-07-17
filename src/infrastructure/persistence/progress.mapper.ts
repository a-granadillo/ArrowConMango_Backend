import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PlayerProgressOrmEntity } from '../../infrastructure/orm/progress.orm-entity';

export class ProgressMapper {
  static toDomain(orm: PlayerProgressOrmEntity): PlayerProgress {
    return PlayerProgress.reconstitute(
      UserId.create(orm.userId),
      orm.completed,
      orm.best,
      orm.currentLevel ?? 0,
    );
  }

  static toOrm(progress: PlayerProgress): PlayerProgressOrmEntity {
    const orm = new PlayerProgressOrmEntity();
    orm.userId = progress.userId.value;
    orm.completed = Array.from(progress.completed);

    const best: Record<string, { moves: number; timeMs: number }> = {};
    for (const [levelId, score] of progress.best) {
      best[levelId] = { moves: score.moves, timeMs: score.timeMs };
    }
    orm.best = best;
    orm.currentLevel = progress.currentLevel;
    return orm;
  }
}
