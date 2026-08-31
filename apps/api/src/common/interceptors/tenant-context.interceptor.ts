import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { firstValueFrom, from, Observable } from 'rxjs';
import { JwtPayload } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Envuelve todo el request autenticado (controller + services, hasta que
 * termina de resolver la respuesta) en una única transacción Postgres con
 * `SET LOCAL app.tenant_id` como primera sentencia — así todas las queries
 * que disparen los services durante el request corren en ESA conexión, y
 * las políticas RLS (prisma/rls.sql) filtran de verdad (sección 8), no solo
 * como defensa en profundidad. El detalle de cómo cada query individual
 * termina redirigida a esa transacción vive en PrismaService ($use +
 * tenantContextStorage) — acá no hace falta tocar nada de eso.
 *
 * Requests sin usuario (login, alta de tenant, webhooks) no abren
 * transacción: siguen su camino normal contra el pool de conexiones.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user?.tenantId) {
      return next.handle();
    }

    return from(this.prisma.ejecutarComoTenant(user.tenantId, () => firstValueFrom(next.handle())));
  }
}
