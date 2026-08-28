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
  refreshToken: string;
  usuario: {
    id: string;
    nombre: string;
    rol: Rol;
    tenantId: string;
  };
}
