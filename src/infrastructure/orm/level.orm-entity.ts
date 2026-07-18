import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('level_definitions')
export class LevelDefinitionOrmEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column()
  name!: string;

  @Column()
  difficulty!: string;

  /** Board coordinate system: 'grid2d' (rectangular) or 'hex' (hexagonal). */
  @Column({ type: 'varchar', default: 'grid2d' })
  shape!: string;

  /** AnyBoardSize serialized as JSON — {rows,cols} for grid2d, {radius} for hex. */
  @Column({ type: 'simple-json' })
  boardSize!: { rows?: number; cols?: number; radius?: number };

  /** ArrowDefinition[] serialized as JSON. */
  @Column({ type: 'simple-json' })
  arrows!: unknown[];

  /** LevelRules serialized as JSON. */
  @Column({ type: 'simple-json' })
  rules!: Record<string, unknown>;

  @Column({ default: 1 })
  version!: number;

  /** null for campaign levels; the creator's user id for community levels. */
  @Column({ type: 'varchar', nullable: true })
  authorId!: string | null;

  @Column({ default: false })
  isPublished!: boolean;

  @Column({ type: 'datetime', nullable: true })
  publishedAt!: Date | null;
}
