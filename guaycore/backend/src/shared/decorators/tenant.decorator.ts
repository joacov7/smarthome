import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../types';

// @TenantId() → extrae el tenantId del JWT en cualquier controller
export const TenantId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user as RequestContext).tenantId;
  },
);

// @CurrentUser() → extrae el contexto completo del usuario
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as RequestContext;
  },
);
