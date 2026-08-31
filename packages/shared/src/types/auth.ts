import { Rol } from './enums';

export interface JwtPayload {
  sub: string; // usuario id
  tenantId: string;
  rol: Rol;
}

export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  // El refresh token viaja en una cookie httpOnly (ver auth.controller.ts),
  // nunca en el body — así no queda expuesto a XSS vía localStorage.
  usuario: {
    id: string;
    nombre: string;
    rol: Rol;
    tenantId: string;
  };
}
