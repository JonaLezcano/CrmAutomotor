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
   * Resuelve el canal de un webhook y deja fijado app.tenant_id para el resto
   * del request (ver rls.sql → resolve_canal_publico). Debe ser lo primero
   * que se llama en cualquier handler de webhook, antes de tocar leads/eventos.
   */
  async resolveCanalParaWebhook(canalId: string) {
    const rows = await this.prisma.$queryRaw<CanalPublico[]>`SELECT * FROM resolve_canal_publico(${canalId}::uuid)`;
    const canal = rows[0];
    if (!canal || !canal.activo) throw new NotFoundException('Canal inexistente o inactivo');

    await this.prisma.setTenantContext(canal.tenant_id);
    return { id: canal.id, tenantId: canal.tenant_id, tipo: canal.tipo };
  }
}
