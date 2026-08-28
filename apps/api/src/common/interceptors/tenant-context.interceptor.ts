import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { from, Observable, switchMap } from 'rxjs';
import { JwtPayload } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Antes de correr el handler, fija el tenant_id de la sesión Postgres para
 * que las políticas RLS (prisma/rls.sql) puedan filtrar (sección 8).
 *
 * Es defensa en profundidad, NO la barrera principal todavía: por el pooling
 * de conexiones de Prisma esto no se propaga de forma confiable entre todas
 * las queries de un mismo request (ver el comentario largo en
 * PrismaService.setTenantContext). Hoy la barrera real es el
 * `where: { tenantId }` explícito en cada service.
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

    return from(this.prisma.setTenantContext(user.tenantId)).pipe(switchMap(() => next.handle()));
  }
}
