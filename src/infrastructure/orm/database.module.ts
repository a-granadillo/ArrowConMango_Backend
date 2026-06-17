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
        const driver = cfg.get<string>('DB_DRIVER', 'sqlite');
        if (driver === 'postgres') {
          return {
            type: 'postgres',
            host: cfg.get('DB_HOST', 'localhost'),
            port: cfg.get<number>('DB_PORT', 5432),
            username: cfg.get('DB_USER', 'postgres'),
            password: cfg.get('DB_PASSWORD', ''),
            database: cfg.get('DB_NAME', 'arrow_con_mango'),
            entities: ORM_ENTITIES,
            synchronize: false,
          };
        }
        return {
          type: 'sqlite',
          database: cfg.get('DB_PATH', 'arrow.sqlite'),
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
