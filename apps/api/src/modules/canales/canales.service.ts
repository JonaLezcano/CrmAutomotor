import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoCanal } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

interface CanalPublico {
  id: string;
  tenant_id: string;
  tipo: TipoCanal;
  activo: boolean;
}

@Injectable()
export class CanalesService {
  constructor(private prisma: PrismaService) {}

  // Configuración de canales: exclusiva de CEO (sección 6).
  create(tenantId: string, tipo: TipoCanal, config: Record<string, unknown>) {
    return this.prisma.canal.create({ data: { tenantId, tipo, config: config as any } });
  }

  findByTenant(tenantId: string) {
    return this.prisma.canal.findMany({ where: { tenantId } });
  }

  setActivo(id: string, activo: boolean) {
    return this.prisma.canal.update({ where: { id }, data: { activo } });
  }

  /**
   * Resuelve el canal de un webhook sin JWT/tenant context todavía (ver
   * rls.sql → resolve_canal_publico). Quien llama a esto debe envolver
   * cualquier escritura que haga después en `prisma.ejecutarComoTenant(...)`
   * con el tenantId devuelto acá — ver canales.controller.ts. Antes esta
   * función intentaba fijar app.tenant_id "para el resto del request" con
   * setTenantContext, pero eso nunca fue confiable (el SET LOCAL vive en la
   * transacción implícita de esa sola sentencia, no en las queries
   * siguientes); quedó demostrado con RLS ya activo de verdad: bloqueaba
   * la ingesta con "new row violates row-level security policy".
   */
  async resolveCanalParaWebhook(canalId: string) {
    const rows = await this.prisma.$queryRaw<CanalPublico[]>`SELECT * FROM resolve_canal_publico(${canalId}::text)`;
    const canal = rows[0];
    if (!canal || !canal.activo) throw new NotFoundException('Canal inexistente o inactivo');

    return { id: canal.id, tenantId: canal.tenant_id, tipo: canal.tipo };
  }
}
