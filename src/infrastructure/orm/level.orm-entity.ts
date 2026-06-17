import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('level_definitions')
export class LevelDefinitionOrmEntity {
  @PrimaryColumn('varchar')
  id!: string;

  /** NodeDefinition[] serialized as JSON. */
  @Column({ type: 'simple-json' })
  nodes!: unknown[];

  /** [string, string][] serialized as JSON. */
  @Column({ type: 'simple-json' })
  edges!: [string, string][];

  /** LevelRules serialized as JSON. */
  @Column({ type: 'simple-json' })
  rules!: Record<string, unknown>;

  @Column({ default: 1 })
  version!: number;
}
