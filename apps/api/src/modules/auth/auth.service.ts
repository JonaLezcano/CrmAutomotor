import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload, LoginResponse, Rol } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(usuario: string, password: string): Promise<LoginResponse> {
    // Nota: consulta corre sin tenant context todavía (es el paso previo a tener JWT),
    // por eso `usuario` es único a nivel global y no se filtra por tenant acá.
    const u = await this.prisma.usuario.findUnique({ where: { usuario } });
    if (!u) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const passwordOk = await bcrypt.compare(password, u.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    // Prisma tipa u.rol contra su propio enum generado desde schema.prisma;
    // los valores coinciden 1:1 con @crm/shared Rol (mismo string), pero TS
    // los ve como tipos nominales distintos, de ahí el cast.
    const payload: JwtPayload = { sub: u.id, tenantId: u.tenantId, rol: u.rol as Rol };

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
      usuario: { id: u.id, nombre: u.nombre, rol: u.rol as Rol, tenantId: u.tenantId },
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
