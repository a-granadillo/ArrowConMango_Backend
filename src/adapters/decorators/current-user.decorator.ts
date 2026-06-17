import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the userId string injected by AuthGuard from the request object.
 * Usage: @CurrentUser() userId: string
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ userId: string }>();
    return request.userId;
  },
);
