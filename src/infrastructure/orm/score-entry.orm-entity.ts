import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from './column-types';

@Entity('score_entries')
export class ScoreEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  userId!: string;

  @Column('varchar')
  levelId!: string;

  @Column('int')
  moves!: number;

  @Column('int')
  timeMs!: number;

  @Column(DATETIME_COLUMN_TYPE)
  at!: Date;

  @Column('varchar', { default: 'campaign' })
  mode!: string;
}
