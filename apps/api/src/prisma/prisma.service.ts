import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Fija app.tenant_id para que las políticas RLS (prisma/rls.sql) filtren lo
   * que se consulte en ESA misma conexión/transacción.
   *
   * LIMITACIÓN CONOCIDA (para el rol de Seguridad, sección 10 del doc de
   * arquitectura): PrismaClient toma conexiones de un pool, y una llamada como
   * esta no garantiza que las queries siguientes del mismo request reutilicen
   * la misma conexión — `set_config(..., true)` es local a la transacción
   * implícita de ESTA sola sentencia. Hoy la interceptor (TenantContextInterceptor)
   * la llama por request como defensa en profundidad, pero la enforcement real
   * sigue siendo el `where: { tenantId }` explícito en cada service. Para que
   * RLS sea la garantía real (y no solo defensa en profundidad) hace falta
   * envolver cada request en un único `prisma.$transaction` con `SET LOCAL`
   * como primera sentencia, y pasar ese `tx` a los services vía contexto de
   * request (AsyncLocalStorage) en vez de inyectar `PrismaService` global.
   * No implementado todavía — queda pendiente antes de confiar en RLS como
   * única barrera.
   */
  async setTenantContext(tenantId: string) {
    await this.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
  }
}
