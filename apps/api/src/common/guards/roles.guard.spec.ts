import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@crm/shared';
import { RolesGuard } from './roles.guard';

function crearContext(user: { rol: Rol } | undefined, rolesRequeridos: Rol[] | undefined) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(rolesRequeridos) } as unknown as Reflector;
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), context };
}

// Sección 6: la jerarquía es vendedor < supervisor < ceo, y @Roles(X) permite
// X y todo lo que esté por encima de X, no solo una coincidencia exacta.
describe('RolesGuard', () => {
  it('permite el acceso si no hay @Roles declarado en el endpoint', () => {
    const { guard, context } = crearContext({ rol: Rol.VENDEDOR }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('bloquea si no hay usuario en el request', () => {
    const { guard, context } = crearContext(undefined, [Rol.VENDEDOR]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('un vendedor no puede entrar a un endpoint @Roles(SUPERVISOR)', () => {
    const { guard, context } = crearContext({ rol: Rol.VENDEDOR }, [Rol.SUPERVISOR]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('un supervisor sí puede entrar a un endpoint @Roles(SUPERVISOR)', () => {
    const { guard, context } = crearContext({ rol: Rol.SUPERVISOR }, [Rol.SUPERVISOR]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('un CEO puede entrar a cualquier endpoint, incluido uno @Roles(VENDEDOR)', () => {
    const { guard, context } = crearContext({ rol: Rol.CEO }, [Rol.VENDEDOR]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('un CEO no puede saltarse un endpoint que exige explícitamente CEO si él mismo no lo es', () => {
    const { guard, context } = crearContext({ rol: Rol.SUPERVISOR }, [Rol.CEO]);
    expect(guard.canActivate(context)).toBe(false);
  });
});
