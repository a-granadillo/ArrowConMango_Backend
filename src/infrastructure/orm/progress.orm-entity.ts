import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_progress')
export class PlayerProgressOrmEntity {
  @PrimaryColumn('varchar')
  userId!: string;

  /** Array of completed level IDs serialized as JSON. */
  @Column({ type: 'simple-json' })
  completed!: string[];

  /**
   * Map of levelId → { moves, timeMs } serialized as JSON.
   * Score.value() is derived, not persisted.
   */
  @Column({ type: 'simple-json' })
  best!: Record<string, { moves: number; timeMs: number }>;
}
