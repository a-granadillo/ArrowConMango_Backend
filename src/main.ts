import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './infrastructure/config/app.module';
import { setupSwagger } from './infrastructure/config/swagger.config';
import { HttpExceptionFilter } from './infrastructure/aop/http-exception.filter';
import { LoggingInterceptor } from './infrastructure/aop/logging.interceptor';
import { MetricsInterceptor } from './infrastructure/aop/metrics.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  console.log(`Arrow con Mango API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
