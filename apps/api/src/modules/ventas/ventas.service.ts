import { ForbiddenException, Injectable } from '@nestjs/common';
import { EstadoLead } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  // Cierre del ciclo de vida del lead (sección 5, paso 7): carga la venta y
  // el lead pasa a `vendido`, saliendo definitivamente de cualquier timer/bolsa.
  async create(tenantId: string, vendedorId: string, dto: CreateVentaDto) {
    // Chequeo explícito de tenant sobre el leadId recibido: RLS todavía no es
    // la barrera confiable acá (ver PrismaService.setTenantContext), así que
    // esto es lo que evita que se cargue una venta sobre un lead de otro tenant.
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead || lead.tenantId !== tenantId) {
      throw new ForbiddenException('Lead inexistente o de otro tenant');
    }

    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          leadId: dto.leadId,
          vendedorId,
          auto: dto.auto,
          modelo: dto.modelo,
          plan: dto.plan,
          cuota: dto.cuota,
          monto: dto.monto,
        },
      });

      await tx.lead.update({ where: { id: dto.leadId }, data: { estado: EstadoLead.vendido } });
      await tx.leadEvento.create({
        data: { leadId: dto.leadId, usuarioId: vendedorId, accion: 'venta_cargada', detalle: `venta=${venta.id}` },
      });

      return venta;
    });
  }

  findByVendedor(vendedorId: string) {
    return this.prisma.venta.findMany({ where: { vendedorId }, orderBy: { fecha: 'desc' } });
  }
}
