import { Injectable } from '@nestjs/common';
import { EstadoLead } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';

export interface IngestLeadInput {
  telefono: string;
  nombre?: string;
  mensaje?: string;
}

// Cuánto tiempo queda un lead visible en la bolsa antes de auto-asignarse (sección 5, paso 3-5).
const TIMER_BOLSA_MINUTOS = 15;

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
    private notificaciones: NotificacionesGateway,
  ) {}

  /**
   * Ingesta + dedup (sección 4/5): mismo telefono+tenant = mismo lead, se
   * fusiona el historial en vez de crear uno nuevo. Un lead que ya estaba
   * cerrado (vendido/perdido) y vuelve a escribir reabre en la bolsa.
   */
  async ingest(tenantId: string, canalId: string, input: IngestLeadInput) {
    const { score, temperatura } = await this.scoringService.calcular(tenantId, input.mensaje ?? '');

    const existente = await this.prisma.lead.findUnique({
      where: { tenantId_telefono: { tenantId, telefono: input.telefono } },
    });

    const timerVenceEn = new Date(Date.now() + TIMER_BOLSA_MINUTOS * 60_000);

    const lead = existente
      ? await this.prisma.lead.update({
          where: { id: existente.id },
          data: {
            nombre: input.nombre ?? existente.nombre,
            score,
            temperatura,
            estado: EstadoLead.en_bolsa,
            vendedorAsignadoId: null,
            fechaAsignacion: null,
            timerVenceEn,
          },
        })
      : await this.prisma.lead.create({
          data: {
            tenantId,
            telefono: input.telefono,
            nombre: input.nombre,
            canalOrigenId: canalId,
            score,
            temperatura,
            estado: EstadoLead.en_bolsa,
            timerVenceEn,
          },
        });

    // Sin usuarioId: la ingesta todavía no tiene un vendedor asignado (recién
    // entra a la bolsa), es un evento de sistema. Antes esto se rellenaba con
    // un id inventado (lead.id) que violaba la FK a usuarios — con RLS
    // corriendo todo el request en una sola transacción (ver
    // TenantContextInterceptor), ese error abortaba y revertía TODA la
    // ingesta en silencio, aunque el catch de acá abajo lo tapara a nivel JS.
    await this.prisma.leadEvento.create({
      data: {
        leadId: lead.id,
        usuarioId: lead.vendedorAsignadoId,
        accion: existente ? 'reingreso_bolsa' : 'ingesta',
        detalle: `canal=${canalId} temperatura=${temperatura} score=${score}`,
      },
    });

    this.notificaciones.emitLeadNuevo(tenantId, lead);
    return lead;
  }

  findBolsa(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId, estado: EstadoLead.en_bolsa },
      orderBy: { fechaPrimerContacto: 'asc' },
    });
  }

  findAsignadosA(vendedorId: string) {
    return this.prisma.lead.findMany({
      where: { vendedorAsignadoId: vendedorId, estado: { in: [EstadoLead.asignado, EstadoLead.contactado] } },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  async marcarResultado(leadId: string, usuarioId: string, estado: EstadoLead, detalle?: string) {
    const lead = await this.prisma.lead.update({ where: { id: leadId }, data: { estado } });
    await this.prisma.leadEvento.create({
      data: { leadId, usuarioId, accion: `resultado:${estado}`, detalle },
    });
    return lead;
  }
}
