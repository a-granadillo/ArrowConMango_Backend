import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('level_definitions')
export class LevelDefinitionOrmEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column()
  name!: string;

  @Column()
  difficulty!: string;

  /** BoardSize serialized as JSON. */
  @Column({ type: 'simple-json' })
  boardSize!: { rows: number; cols: number };

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
}
