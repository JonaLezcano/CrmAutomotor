import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload, LoginResponse, Rol } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

interface UsuarioLogin {
  id: string;
  tenant_id: string;
  nombre: string;
  password_hash: string;
  rol: Rol;
}

// A diferencia de LoginResponse (lo que efectivamente sale por HTTP), acá
// adentro sigue haciendo falta el refreshToken en texto plano: el controller
// lo saca de esto para meterlo en la cookie httpOnly, nunca en el body.
interface ResultadoLogin extends LoginResponse {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(usuario: string, password: string): Promise<ResultadoLogin> {
    // Sin JWT todavía (es el paso previo a tener uno), así que no hay
    // app.tenant_id fijado en la conexión — bajo RLS estricto, un
    // `findUnique` normal devolvería 0 filas aunque el usuario exista
    // (huevo y gallina, igual que resolve_canal_publico en el webhook).
    // Esta función SECURITY DEFINER es la única forma autorizada de buscar
    // por `usuario` (único a nivel global a propósito, sección 4) sin
    // contexto de tenant. Ver rls.sql.
    const rows = await this.prisma.$queryRaw<UsuarioLogin[]>`SELECT * FROM resolve_usuario_login(${usuario}::text)`;
    const u = rows[0];
    if (!u) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const passwordOk = await bcrypt.compare(password, u.password_hash);
    if (!passwordOk) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const payload: JwtPayload = { sub: u.id, tenantId: u.tenant_id, rol: u.rol };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      usuario: { id: u.id, nombre: u.nombre, rol: u.rol, tenantId: u.tenant_id },
    };
  }

  async refresh(refreshToken: string): Promise<Pick<LoginResponse, 'accessToken'>> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    const accessToken = this.jwt.sign(
      { sub: payload.sub, tenantId: payload.tenantId, rol: payload.rol },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') },
    );
    return { accessToken };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
}
