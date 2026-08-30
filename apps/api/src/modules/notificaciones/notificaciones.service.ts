import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private prisma: PrismaService) {}

  async crear(usuarioId: string, tipo: string, payload: Record<string, unknown>) {
    const notificacion = await this.prisma.notificacion.create({
      data: { usuarioId, tipo, payload: payload as any },
    });
    await this.enviarPush(usuarioId, tipo, payload);
    return notificacion;
  }

  // El id de la notificación no alcanza para autorizar: sin el filtro por
  // usuarioId, cualquiera podría marcar como leída una notificación ajena
  // adivinando el id.
  async marcarLeido(id: string, usuarioId: string) {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data: { leido: true },
    });
    if (count === 0) throw new ForbiddenException('Notificación inexistente o de otro usuario');
    return this.prisma.notificacion.findUniqueOrThrow({ where: { id } });
  }

  findNoLeidas(usuarioId: string) {
    return this.prisma.notificacion.findMany({ where: { usuarioId, leido: false }, orderBy: { timestamp: 'desc' } });
  }

  /**
   * Web Push / FCM (sección 2 y 7): alerta aunque el vendedor no tenga la
   * pestaña activa. Placeholder — falta registrar suscripciones push por
   * usuario y cablear las credenciales VAPID/FCM antes de que esto haga algo.
   */
  private async enviarPush(usuarioId: string, tipo: string, payload: Record<string, unknown>) {
    this.logger.debug(`[push stub] usuario=${usuarioId} tipo=${tipo} payload=${JSON.stringify(payload)}`);
  }
}
