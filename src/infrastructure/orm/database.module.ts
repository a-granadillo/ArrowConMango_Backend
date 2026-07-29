import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ORM_ENTITIES,
  buildDataSourceOptions,
} from './data-source-options.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        buildDataSourceOptions({
          dbDriver: cfg.get<string>('app.dbDriver', 'sqlite', { infer: true }),
          dbPath: cfg.get<string>('app.dbPath', 'arrow.sqlite', {
            infer: true,
          }),
          databaseUrl: cfg.get<string>('app.databaseUrl', { infer: true }),
          dbHost: cfg.get<string>('app.dbHost', 'localhost', { infer: true }),
          dbPort: cfg.get<number>('app.dbPort', 5432, { infer: true }),
          dbUser: cfg.get<string>('app.dbUser', 'postgres', { infer: true }),
          dbPassword: cfg.get<string>('app.dbPassword', '', { infer: true }),
          dbName: cfg.get<string>('app.dbName', 'arrow_con_mango', {
            infer: true,
          }),
          dbSynchronize: cfg.get<boolean>('app.dbSynchronize', true, {
            infer: true,
          }),
          dbSsl: cfg.get<boolean>('app.dbSsl', true, { infer: true }),
        }),
    }),
    TypeOrmModule.forFeature(ORM_ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
