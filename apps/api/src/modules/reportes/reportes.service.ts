import { Injectable } from '@nestjs/common';
import { TipoCanal } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

const TENDENCIA_DIAS = 14;

// "2026-08" -> [2026-08-01T00:00:00Z, 2026-09-01T00:00:00Z). En UTC a
// propósito: mismo criterio simple en todo el reporte, sin depender de la
// timezone del server para decidir a qué mes calendario pertenece una venta.
function rangoDeMes(periodo: string): [Date, Date] {
  const [anio, mes] = periodo.split('-').map(Number);
  return [new Date(Date.UTC(anio, mes - 1, 1)), new Date(Date.UTC(anio, mes, 1))];
}

function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // Vista de supervisor (sección 6): stats agregados de su equipo (todo el tenant,
  // hasta que exista el concepto de "equipo" dentro de un tenant).
  async resumenTenant(tenantId: string) {
    const [porEstado, porTemperatura, ventas, canales, leadsPorCanal, disponibilidadEquipo] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['estado'], where: { tenantId }, _count: true }),
      this.prisma.lead.groupBy({ by: ['temperatura'], where: { tenantId }, _count: true }),
      this.prisma.venta.aggregate({
        where: { lead: { tenantId } },
        _sum: { monto: true },
        _count: true,
      }),
      this.prisma.canal.findMany({ where: { tenantId }, select: { id: true, tipo: true } }),
      // Prisma no puede agrupar por un campo de una relación (canal.tipo) en
      // una sola query — se agrupa por canalOrigenId y se resuelve el tipo
      // en JS con el listado de canales de arriba (dataset chico, por tenant).
      this.prisma.lead.groupBy({ by: ['canalOrigenId'], where: { tenantId }, _count: true }),
      this.prisma.usuario.groupBy({ by: ['estadoDisponibilidad'], where: { tenantId, rol: 'vendedor' }, _count: true }),
    ]);

    const tipoDeCanal = new Map(canales.map((c) => [c.id, c.tipo]));
    const conteoPorTipo = new Map<string, number>();
    for (const l of leadsPorCanal) {
      const tipo = tipoDeCanal.get(l.canalOrigenId) ?? 'desconocido';
      conteoPorTipo.set(tipo, (conteoPorTipo.get(tipo) ?? 0) + l._count);
    }
    const porCanal = [...conteoPorTipo.entries()].map(([tipo, cantidad]) => ({ tipo, cantidad }));

    return {
      porEstado,
      porTemperatura,
      porCanal,
      disponibilidadEquipo: disponibilidadEquipo.map((d) => ({ estado: d.estadoDisponibilidad, cantidad: d._count })),
      ventas: { cantidad: ventas._count, montoTotal: ventas._sum.monto ?? 0 },
    };
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

  /**
   * Ventas de los últimos 14 días, un punto por día (con ceros en los días
   * sin ventas, para que el gráfico no tenga huecos). Se trae todo con
   * findMany + se agrupa por día en JS en vez de un $queryRaw con
   * date_trunc: un raw query no pasa por el redirect a la transacción del
   * request (ver prisma.service.ts → $use), así que bajo RLS real correría
   * en una conexión sin tenant seteado y devolvería 0 filas siempre.
   */
  async tendenciaVentas(tenantId: string) {
    const desde = new Date(Date.now() - TENDENCIA_DIAS * 24 * 60 * 60 * 1000);
    const ventas = await this.prisma.venta.findMany({
      where: { lead: { tenantId }, fecha: { gte: desde } },
      select: { fecha: true, monto: true },
    });

    const porDia = new Map<string, { cantidad: number; monto: number }>();
    for (const v of ventas) {
      const clave = v.fecha.toISOString().slice(0, 10);
      const actual = porDia.get(clave) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += Number(v.monto);
      porDia.set(clave, actual);
    }

    const resultado: { fecha: string; cantidad: number; monto: number }[] = [];
    for (let i = TENDENCIA_DIAS - 1; i >= 0; i--) {
      const fecha = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      resultado.push({ fecha, ...(porDia.get(fecha) ?? { cantidad: 0, monto: 0 }) });
    }
    return resultado;
  }

  /**
   * Inversión publicitaria (carga manual, sección 10 — CEO-only) cruzada
   * contra leads/ventas del mismo mes calendario, agrupados por canal.tipo.
   * CPL = costo por lead, CPA = costo por venta real (adquisición), ROAS =
   * retorno sobre lo invertido. Los tres quedan `null` (no directamente 0)
   * cuando el denominador es 0 — dividir por cero no es "gratis", es "no hay
   * dato todavía", y el frontend lo muestra como "—" en vez de $0 o 0%.
   */
  async inversionPorCanal(tenantId: string, periodo: string = mesActual()) {
    const [inicio, fin] = rangoDeMes(periodo);

    const [canales, leadsDelMes, ventasDelMes, inversiones] = await Promise.all([
      this.prisma.canal.findMany({ where: { tenantId }, select: { id: true, tipo: true } }),
      this.prisma.lead.findMany({
        where: { tenantId, fechaPrimerContacto: { gte: inicio, lt: fin } },
        select: { canalOrigenId: true },
      }),
      this.prisma.venta.findMany({
        where: { lead: { tenantId }, fecha: { gte: inicio, lt: fin } },
        select: { monto: true, lead: { select: { canalOrigenId: true } } },
      }),
      this.prisma.inversionCanal.findMany({ where: { tenantId, periodo } }),
    ]);

    const tipoDeCanal = new Map(canales.map((c) => [c.id, c.tipo]));

    const leadsPorTipo = new Map<string, number>();
    for (const l of leadsDelMes) {
      const tipo = tipoDeCanal.get(l.canalOrigenId) ?? 'desconocido';
      leadsPorTipo.set(tipo, (leadsPorTipo.get(tipo) ?? 0) + 1);
    }

    const ventasPorTipo = new Map<string, { cantidad: number; monto: number }>();
    for (const v of ventasDelMes) {
      const tipo = tipoDeCanal.get(v.lead.canalOrigenId) ?? 'desconocido';
      const actual = ventasPorTipo.get(tipo) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += Number(v.monto);
      ventasPorTipo.set(tipo, actual);
    }

    const inversionPorTipo = new Map<string, number>(inversiones.map((i) => [i.tipo, Number(i.monto)]));

    // Todos los tipos con algún dato este mes (canal dado de alta, lead
    // recibido o inversión cargada) — para no esconder, por ejemplo, un
    // canal con inversión cargada pero cero leads todavía.
    const tipos = new Set<string>([...tipoDeCanal.values(), ...inversionPorTipo.keys()]);

    return [...tipos].map((tipo) => {
      const inversion = inversionPorTipo.get(tipo) ?? 0;
      const leads = leadsPorTipo.get(tipo) ?? 0;
      const ventas = ventasPorTipo.get(tipo) ?? { cantidad: 0, monto: 0 };
      return {
        tipo,
        inversion,
        leads,
        cantidadVentas: ventas.cantidad,
        montoVentas: ventas.monto,
        cpl: leads > 0 ? inversion / leads : null,
        cpa: ventas.cantidad > 0 ? inversion / ventas.cantidad : null,
        roas: inversion > 0 ? ventas.monto / inversion : null,
      };
    });
  }

  async guardarInversion(tenantId: string, tipo: TipoCanal, periodo: string, monto: number) {
    return this.prisma.inversionCanal.upsert({
      where: { tenantId_tipo_periodo: { tenantId, tipo, periodo } },
      update: { monto },
      create: { tenantId, tipo, periodo, monto },
    });
  }

  // Nota: "stats globales" del CEO (sección 6) es global DENTRO de su tenant
  // (todas las marcas/equipos de esa concesionaria), no cross-tenant — cada
  // concesionaria es un cliente aislado del SaaS (sección 1). Por eso no hay
  // acá ningún query sin `where: { tenantId }`; un reporte realmente
  // multi-tenant sería para un futuro rol de admin de plataforma, que hoy no
  // existe en este documento.
}
