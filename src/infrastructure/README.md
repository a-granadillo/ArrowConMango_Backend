# Capa 4 — Frameworks & Drivers (TODO - Next Phase)

Detalles más volátiles y reemplazables. Si se cambia de TypeORM a Prisma,
o de bcrypt a argon2, ninguna capa interna se ve afectada.

## Archivos a implementar

### orm/
- `user.orm-entity.ts`        — entidad TypeORM `UserOrmEntity` con columnas y decoradores
- `progress.orm-entity.ts`    — `PlayerProgressOrmEntity`
- `level.orm-entity.ts`       — `LevelDefinitionOrmEntity` (guarda nodes/edges como JSONB)
- `score-entry.orm-entity.ts` — `ScoreEntryOrmEntity`
- `database.module.ts`        — `TypeOrmModule.forRootAsync(...)` con soporte SQLite (dev) y
                                PostgreSQL (prod) vía `DB_DRIVER` en `.env`

### auth/
- `jwt-token.service.ts` — `JwtTokenService implements ITokenService`
  - `sign(userId)` → `jwt.sign({ sub: userId.value }, secret, { expiresIn })`
  - `verify(token)` → `UserId.create(jwt.verify(token, secret).sub)`
- `bcrypt-hasher.ts`     — `BcryptHasher implements IPasswordHasher`
  - `hash(plain)` → `bcrypt.hash(plain, 12)` → `PasswordHash.fromHash(...)`
  - `compare(plain, hash)` → `bcrypt.compare(plain, hash.hash)`
- `auth.module.ts`       — configura PassportJS + JwtModule

### config/
- `app.module.ts` — módulo raíz de NestJS; registra todos los módulos
- `swagger.config.ts` — `SwaggerModule.setup('/api/docs', app, document)`
- `env.config.ts`    — carga y valida variables de entorno

### Composition Root (DI)
NestJS resuelve la inyección en `app.module.ts`. El único lugar donde se instancian
implementaciones concretas y se inyectan en los casos de uso (DIP en acción):

```typescript
// Ejemplo de cómo NestJS inyecta sin que el caso de uso lo sepa:
@Module({
  providers: [
    RegisterUserUseCase,
    { provide: 'IUserRepository', useClass: TypeOrmUserRepository },
    { provide: 'IPasswordHasher', useClass: BcryptHasher },
  ],
})
export class AuthModule {}
```

### main.ts (stub actual → implementar)
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './infrastructure/config/app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
