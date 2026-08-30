import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstadoLead } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaSystemService } from '../../prisma/prisma-system.service';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

// TODO(pendiente de definir con Jona, sección 5 paso 6): plazo sin contacto
// antes de que un lead asignado vuelva a la bolsa. Default provisorio.
const PLAZO_SIN_CONTACTO_MINUTOS = 30;

@Injectable()
export class BolsaService {
  private readonly logger = new Logger(BolsaService.name);

  constructor(
    // `tomar` y `asignarManual` corren dentro de un request HTTP autenticado:
    // usan `prisma` (RLS ya scopeado a un tenant por TenantContextInterceptor).
    private prisma: PrismaService,
    // Los @Cron corren sin request/tenant: usan `sys`, que ve todos los tenants
    // a propósito (ver prisma-system.service.ts) y filtra por tenant a mano.
    private sys: PrismaSystemService,
    private gateway: NotificacionesGateway,
    private notificaciones: NotificacionesService,
  ) {}

  /**
   * Toma libre (sección 5, paso 4): el primer vendedor que la pide se la
   * queda. El `updateMany` con `estado: en_bolsa` en el where hace de lock
   * optimista — si dos vendedores tocan "tomar" al mismo tiempo, solo el
   * primer UPDATE afecta una fila; el segundo afecta 0 y tira 409.
   */
  async tomar(leadId: string, tenantId: string, usuarioId: string) {
    const { count } = await this.prisma.lead.updateMany({
      where: { id: leadId, tenantId, estado: EstadoLead.en_bolsa },
      data: { estado: EstadoLead.asignado, vendedorAsignadoId: usuarioId, fechaAsignacion: new Date(), timerVenceEn: null },
    });

    if (count === 0) {
      throw new ConflictException('El lead ya no está en la bolsa (otro vendedor lo tomó o venció el timer)');
    }

    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.prisma.leadEvento.create({
      data: { leadId, usuarioId, accion: 'toma_libre' },
    });

    this.gateway.emitLeadAsignado(tenantId, lead, usuarioId, false);
    return lead;
  }

  /**
   * Auto-asignación por timeout (sección 5, paso 5): corre cada minuto,
   * busca leads en bolsa con el timer vencido y se los da al primer vendedor
   * disponible que encuentre el sistema.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoAsignarVencidos() {
    const vencidos = await this.sys.lead.findMany({
      where: { estado: EstadoLead.en_bolsa, timerVenceEn: { lte: new Date() } },
    });

    for (const lead of vencidos) {
      const disponibles = await this.sys.usuario.findMany({
        where: { tenantId: lead.tenantId, rol: 'vendedor', estadoDisponibilidad: 'disponible' },
      });
      if (disponibles.length === 0) {
        this.logger.warn(`Lead ${lead.id} venció su timer pero no hay vendedores disponibles en tenant ${lead.tenantId}`);
        continue;
      }

      const vendedor = disponibles[0];
      const { count } = await this.sys.lead.updateMany({
        where: { id: lead.id, estado: EstadoLead.en_bolsa },
        data: { estado: EstadoLead.asignado, vendedorAsignadoId: vendedor.id, fechaAsignacion: new Date(), timerVenceEn: null },
      });
      if (count === 0) continue; // alguien lo tomó justo antes del cron

      await this.sys.leadEvento.create({
        data: { leadId: lead.id, usuarioId: vendedor.id, accion: 'auto_asignacion' },
      });

      const actualizado = await this.sys.lead.findUniqueOrThrow({ where: { id: lead.id } });
      this.gateway.emitLeadAsignado(lead.tenantId, actualizado, vendedor.id, true);
      await this.notificaciones.crear(vendedor.id, 'lead_asignado', { leadId: lead.id });
    }
  }

  /**
   * Vuelta a bolsa por falta de contacto (sección 5, paso 6): corre cada
   * minuto, revisa leads `asignado` que superaron el plazo sin pasar a
   * `contactado`, y los repite con un vendedor distinto.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async liberarSinContacto() {
    const limite = new Date(Date.now() - PLAZO_SIN_CONTACTO_MINUTOS * 60_000);
    const vencidos = await this.sys.lead.findMany({
      where: { estado: EstadoLead.asignado, fechaAsignacion: { lte: limite } },
    });

    for (const lead of vencidos) {
      const timerVenceEn = new Date(Date.now() + 15 * 60_000);
      const actualizado = await this.sys.lead.update({
        where: { id: lead.id },
        data: { estado: EstadoLead.en_bolsa, vendedorAsignadoId: null, fechaAsignacion: null, timerVenceEn },
      });

      await this.sys.leadEvento.create({
        data: {
          leadId: lead.id,
          usuarioId: lead.vendedorAsignadoId!,
          accion: 'liberado_sin_contacto',
          detalle: `plazo=${PLAZO_SIN_CONTACTO_MINUTOS}min`,
        },
      });

      this.gateway.emitLeadLiberado(lead.tenantId, actualizado, 'sin_contacto');
    }
  }

  async asignarManual(leadId: string, tenantId: string, vendedorId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    const actualizado = await this.prisma.lead.update({
      where: { id: leadId },
      data: { estado: EstadoLead.asignado, vendedorAsignadoId: vendedorId, fechaAsignacion: new Date(), timerVenceEn: null },
    });

    await this.prisma.leadEvento.create({
      data: { leadId, usuarioId: vendedorId, accion: 'asignacion_manual' },
    });

    this.gateway.emitLeadAsignado(tenantId, actualizado, vendedorId, false);
    await this.notificaciones.crear(vendedorId, 'lead_asignado', { leadId });
    return actualizado;
  }
}
