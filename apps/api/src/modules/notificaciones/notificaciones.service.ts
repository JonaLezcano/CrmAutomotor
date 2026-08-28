import { Injectable, Logger } from '@nestjs/common';
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

  marcarLeido(id: string) {
    return this.prisma.notificacion.update({ where: { id }, data: { leido: true } });
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
