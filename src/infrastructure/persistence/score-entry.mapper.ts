import { ScoreEntry } from '../../domain/entities/score-entry.entity';
import { GameMode } from '../../domain/value-objects/game-mode.vo';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { Score } from '../../domain/value-objects/score.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ScoreEntryOrmEntity } from '../../infrastructure/orm/score-entry.orm-entity';

export class ScoreEntryMapper {
  static toDomain(orm: ScoreEntryOrmEntity): ScoreEntry {
    return ScoreEntry.reconstitute(
      UserId.create(orm.userId),
      LevelId.create(orm.levelId),
      Score.create(orm.moves, orm.timeMs),
      new Date(orm.at),
      GameMode.create(orm.mode ?? 'campaign'),
    );
  }

  static toOrm(entry: ScoreEntry): ScoreEntryOrmEntity {
    const orm = new ScoreEntryOrmEntity();
    orm.userId = entry.userId.value;
    orm.levelId = entry.levelId.value;
    orm.moves = entry.score.moves;
    orm.timeMs = entry.score.timeMs;
    orm.at = entry.at;
    orm.mode = entry.mode.value;
    return orm;
  }
}
