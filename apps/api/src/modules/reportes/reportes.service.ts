import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // Vista de supervisor (sección 6): stats agregados de su equipo (todo el tenant,
  // hasta que exista el concepto de "equipo" dentro de un tenant).
  async resumenTenant(tenantId: string) {
    const [porEstado, porTemperatura, ventas] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['estado'], where: { tenantId }, _count: true }),
      this.prisma.lead.groupBy({ by: ['temperatura'], where: { tenantId }, _count: true }),
      this.prisma.venta.aggregate({
        where: { lead: { tenantId } },
        _sum: { monto: true },
        _count: true,
      }),
    ]);

    return { porEstado, porTemperatura, ventas: { cantidad: ventas._count, montoTotal: ventas._sum.monto ?? 0 } };
  }

  async rankingVendedores(tenantId: string) {
    const ventas = await this.prisma.venta.groupBy({
      by: ['vendedorId'],
      where: { lead: { tenantId } },
      _count: true,
      _sum: { monto: true },
      orderBy: { _sum: { monto: 'desc' } },
    });

    const vendedores = await this.prisma.usuario.findMany({
      where: { id: { in: ventas.map((v) => v.vendedorId) } },
      select: { id: true, nombre: true },
    });
    const nombreDe = new Map(vendedores.map((v) => [v.id, v.nombre]));

    return ventas.map((v) => ({
      vendedorId: v.vendedorId,
      nombre: nombreDe.get(v.vendedorId) ?? '—',
      cantidadVentas: v._count,
      montoTotal: v._sum.monto ?? 0,
    }));
  }

  // Nota: "stats globales" del CEO (sección 6) es global DENTRO de su tenant
  // (todas las marcas/equipos de esa concesionaria), no cross-tenant — cada
  // concesionaria es un cliente aislado del SaaS (sección 1). Por eso no hay
  // acá ningún query sin `where: { tenantId }`; un reporte realmente
  // multi-tenant sería para un futuro rol de admin de plataforma, que hoy no
  // existe en este documento.
}
