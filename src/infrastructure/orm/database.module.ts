import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LevelDefinitionOrmEntity } from './level.orm-entity';
import { PlayerProgressOrmEntity } from './progress.orm-entity';
import { ScoreEntryOrmEntity } from './score-entry.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

const ORM_ENTITIES = [
  UserOrmEntity,
  PlayerProgressOrmEntity,
  LevelDefinitionOrmEntity,
  ScoreEntryOrmEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const driver = cfg.get<string>('app.dbDriver', 'sqlite', {
          infer: true,
        });
        if (driver === 'postgres') {
          return {
            type: 'postgres',
            host: cfg.get<string>('app.dbHost', 'localhost', { infer: true }),
            port: cfg.get<number>('app.dbPort', 5432, { infer: true }),
            username: cfg.get<string>('app.dbUser', 'postgres', {
              infer: true,
            }),
            password: cfg.get<string>('app.dbPassword', '', { infer: true }),
            database: cfg.get<string>('app.dbName', 'arrow_con_mango', {
              infer: true,
            }),
            entities: ORM_ENTITIES,
            synchronize: false,
          };
        }
        return {
          type: 'sqlite',
          database: cfg.get<string>('app.dbPath', 'arrow.sqlite', {
            infer: true,
          }),
          entities: ORM_ENTITIES,
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature(ORM_ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
