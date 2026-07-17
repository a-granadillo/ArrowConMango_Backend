import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidEmailError,
  LevelForbiddenError,
  LevelNotFoundError,
  LevelValidationError,
  UnauthorizedError,
  UserNotFoundError,
} from '../../domain/errors/domain-error';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

/**
 * «AOP aspect» HttpExceptionFilter (D6).
 *
 * Maps DomainErrors to uniform HTTP responses. The domain never knows HTTP codes;
 * this filter is the only translator. Catches all errors globally so controllers
 * never contain try/catch for domain errors (SRP + OCP).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { statusCode, body } = this.resolve(exception);
    this.logger.error(`${statusCode} — ${body.message}`);
    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    body: ErrorResponse;
  } {
    if (exception instanceof EmailAlreadyInUseError) {
      return this.build(HttpStatus.CONFLICT, exception);
    }
    if (
      exception instanceof InvalidCredentialsError ||
      exception instanceof UnauthorizedError
    ) {
      return this.build(HttpStatus.UNAUTHORIZED, exception);
    }
    if (
      exception instanceof InvalidEmailError ||
      exception instanceof LevelValidationError
    ) {
      return this.build(HttpStatus.UNPROCESSABLE_ENTITY, exception);
    }
    if (
      exception instanceof UserNotFoundError ||
      exception instanceof LevelNotFoundError
    ) {
      return this.build(HttpStatus.NOT_FOUND, exception);
    }
    if (exception instanceof LevelForbiddenError) {
      return this.build(HttpStatus.FORBIDDEN, exception);
    }
    if (exception instanceof DomainError) {
      return this.build(HttpStatus.BAD_REQUEST, exception);
    }
    // NestJS HttpException passthrough
    const httpEx = exception as { getStatus?: () => number; message?: string };
    if (typeof httpEx.getStatus === 'function') {
      const status = httpEx.getStatus();
      return {
        statusCode: status,
        body: {
          statusCode: status,
          error: 'HttpException',
          message: httpEx.message ?? '',
        },
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: 500,
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
    };
  }

  private build(
    status: number,
    err: Error,
  ): { statusCode: number; body: ErrorResponse } {
    return {
      statusCode: status,
      body: {
        statusCode: status,
        error: err.constructor.name,
        message: err.message,
      },
    };
  }
}
