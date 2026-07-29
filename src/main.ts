import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './infrastructure/config/app.module';
import { setupSwagger } from './infrastructure/config/swagger.config';
import { HttpExceptionFilter } from './infrastructure/aop/http-exception.filter';
import { LoggingInterceptor } from './infrastructure/aop/logging.interceptor';
import { MetricsInterceptor } from './infrastructure/aop/metrics.interceptor';
import { seedLevels } from './infrastructure/seed';

const DEFAULT_JWT_SECRET = 'change-me-in-production';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const nodeEnv = config.get<string>('app.nodeEnv', 'development', {
    infer: true,
  });
  const jwtSecret = config.get<string>('app.jwtSecret', { infer: true });
  if (nodeEnv === 'production' && jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET must be set to a real secret when NODE_ENV=production. ' +
        'Refusing to boot with the default placeholder value.',
    );
  }

  const corsOrigins = config.get<string[]>('app.corsOrigins', []);
  app.enableCors(
    corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: true }, // no allowlist configured (e.g. local dev) — reflect any origin
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new MetricsInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  if (config.get<boolean>('app.seedOnBoot', false, { infer: true })) {
    await seedLevels(app.get(DataSource));
  }

  const port = config.get<number>('app.port', 3000, { infer: true });
  await app.listen(port);
  console.log(`Arrow con Mango API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
