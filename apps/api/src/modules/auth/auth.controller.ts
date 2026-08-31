import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// Cookie httpOnly (sección 10, "Seguridad"): antes el refresh token viajaba
// en el body de la respuesta y el frontend lo guardaba en localStorage,
// legible por cualquier script que corra en la página (XSS). Ahora nunca
// toca JS: el navegador la manda solo, sin que el frontend pueda leerla.
const COOKIE_REFRESH = 'refreshToken';
const COOKIE_PATH = '/api/auth';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // igual al default de JWT_REFRESH_EXPIRES_IN

function opcionesCookie() {
  const produccion = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: produccion,
    // SameSite=None hace falta si front y back terminan en dominios
    // distintos en producción (y exige Secure); en dev, Lax alcanza y evita
    // requerir HTTPS local.
    sameSite: (produccion ? 'none' : 'lax') as 'none' | 'lax',
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, usuario } = await this.authService.login(dto.usuario, dto.password);
    res.cookie(COOKIE_REFRESH, refreshToken, opcionesCookie());
    return { accessToken, usuario };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.[COOKIE_REFRESH];
    if (!refreshToken) throw new UnauthorizedException('Sin sesión');
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_REFRESH, { path: COOKIE_PATH });
  }
}
