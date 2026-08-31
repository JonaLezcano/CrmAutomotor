import { ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaSystemService } from '../../prisma/prisma-system.service';
import { SuscribirPushDto } from './dto/suscribir-push.dto';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    // `marcarLeido`/`findNoLeidas`/las suscripciones push corren siempre
    // dentro de un request HTTP autenticado (RLS ya scopeado por
    // TenantContextInterceptor) — usan `prisma`.
    private prisma: PrismaService,
    // `crear()` (y el envío de push que dispara) se llama tanto desde un
    // request HTTP (asignación manual) como desde el @Cron de
    // bolsa.service.ts (auto-asignación, sin ningún tenant context activo).
    // Bajo RLS real, ese segundo caso pega contra `app.tenant_id` sin setear
    // y la policy de `notificaciones` rechaza el INSERT — por eso usa `sys`
    // (BYPASSRLS) en vez de `prisma`. Es seguro: el usuarioId que recibe ya
    // viene validado por quien llama (bolsa.service.ts filtra vendedores por
    // tenantId antes de pasar el id acá), mismo patrón que el resto de los
    // jobs de sistema.
    private sys: PrismaSystemService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');
    if (!publicKey || !privateKey || !subject) {
      this.logger.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT no configuradas — push queda desactivado.');
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  vapidPublicKey() {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') ?? null };
  }

  async crear(usuarioId: string, tipo: string, payload: Record<string, unknown>) {
    const notificacion = await this.sys.notificacion.create({
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

  // Alta idempotente: el mismo endpoint (navegador+dispositivo) puede volver
  // a suscribirse (ej. el service worker se re-registra) sin duplicar fila.
  guardarSuscripcion(usuarioId: string, sub: SuscribirPushDto) {
    return this.prisma.pushSuscripcion.upsert({
      where: { endpoint: sub.endpoint },
      update: { usuarioId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { usuarioId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async eliminarSuscripcion(usuarioId: string, endpoint: string) {
    await this.prisma.pushSuscripcion.deleteMany({ where: { usuarioId, endpoint } });
  }

  /**
   * Web Push (sección 2 y 7): alerta aunque el vendedor no tenga la pestaña
   * activa. Manda a TODAS las suscripciones del usuario (puede tener varios
   * dispositivos/navegadores) y da de baja las que el push service reporta
   * como vencidas (404/410) — el navegador las revoca sin avisar al backend.
   */
  private async enviarPush(usuarioId: string, tipo: string, payload: Record<string, unknown>) {
    const suscripciones = await this.sys.pushSuscripcion.findMany({ where: { usuarioId } });
    if (suscripciones.length === 0) return;

    const body = JSON.stringify({ tipo, payload });

    await Promise.all(
      suscripciones.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.sys.pushSuscripcion.deleteMany({ where: { id: sub.id } });
          } else {
            this.logger.warn(`Push a usuario=${usuarioId} falló (status=${status ?? 'desconocido'})`);
          }
        }
      }),
    );
  }
}
