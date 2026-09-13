import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() decorator — injects the authenticated Supabase user
 * from the request object (set by SupabaseAuthGuard).
 *
 * Usage:
 *   @Get()
 *   @UseGuards(SupabaseAuthGuard)
 *   findAll(@CurrentUser() user: any) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
