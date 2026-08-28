import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol, JwtPayload } from '@crm/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Jerarquía de sección 6: cada rol ve/hace lo del nivel de abajo.
const JERARQUIA: Record<Rol, number> = {
  [Rol.VENDEDOR]: 0,
  [Rol.SUPERVISOR]: 1,
  [Rol.CEO]: 2,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user) return false;

    const nivelMinimoRequerido = Math.min(...rolesRequeridos.map((r) => JERARQUIA[r]));
    return JERARQUIA[user.rol] >= nivelMinimoRequerido;
  }
}
