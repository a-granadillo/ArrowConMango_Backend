import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('datetime')
  at!: Date;
}
