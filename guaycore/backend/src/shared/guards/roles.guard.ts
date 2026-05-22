import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, RequestContext } from '../types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) =>
  Reflect.metadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { role } = ctx.switchToHttp().getRequest().user as RequestContext;

    // Super admin bypasea cualquier restricción de rol
    if (role === UserRole.SUPER_ADMIN) return true;

    if (!required.includes(role)) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
