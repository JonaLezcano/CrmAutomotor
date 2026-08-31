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
    // Chequeo explícito de tenant sobre el leadId recibido: RLS ya bloquea el
    // acceso cross-tenant (ver TenantContextInterceptor), pero este check da
    // un 403 explícito en vez de un "lead inexistente" confuso si alguien
    // manda un leadId de otro tenant.
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead || lead.tenantId !== tenantId) {
      throw new ForbiddenException('Lead inexistente o de otro tenant');
    }

    // Sin $transaction propio: todo el request ya corre dentro de la
    // transacción que abre TenantContextInterceptor (ver prisma.service.ts),
    // así que estos tres writes ya son atómicos entre sí — envolverlos de
    // nuevo abriría una transacción anidada en una conexión distinta, sin
    // el tenant seteado, y RLS la bloquearía.
    const venta = await this.prisma.venta.create({
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

    await this.prisma.lead.update({ where: { id: dto.leadId }, data: { estado: EstadoLead.vendido } });
    await this.prisma.leadEvento.create({
      data: { leadId: dto.leadId, usuarioId: vendedorId, accion: 'venta_cargada', detalle: `venta=${venta.id}` },
    });

    return venta;
  }

  findByVendedor(vendedorId: string) {
    return this.prisma.venta.findMany({ where: { vendedorId }, orderBy: { fecha: 'desc' } });
  }
}
