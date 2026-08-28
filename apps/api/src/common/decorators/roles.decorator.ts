import { SetMetadata } from '@nestjs/common';
import { Rol } from '@crm/shared';

export const ROLES_KEY = 'roles';

/** Marca un endpoint como accesible solo para los roles dados (jerarquía: vendedor < supervisor < ceo). */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
