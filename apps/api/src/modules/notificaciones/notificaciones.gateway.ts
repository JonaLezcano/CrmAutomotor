import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Lead as PrismaLead } from '@prisma/client';
import { JwtPayload, SocketEvent } from '@crm/shared';

// Sala por tenant: todos los vendedores `disponible` de un tenant escuchan el
// mismo canal (sección 7). El cliente se une mandando su access token; el
// gateway lo valida y lo mete en la sala de SU tenant (nunca uno arbitrario).
//
// Nota de tipos: acá adentro un lead todavía es un objeto Prisma (fechas como
// Date), no el `Lead` de @crm/shared (fechas como string ISO) — ese es el
// shape que recibe el frontend recién después de que socket.io serializa el
// payload a JSON. Por eso los métodos de abajo tipan contra PrismaLead.
@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificacionesGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  handleJoin(client: Socket, accessToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(accessToken, { secret: this.config.get('JWT_ACCESS_SECRET') });
      client.join(this.salaTenant(payload.tenantId));
    } catch {
      client.disconnect();
    }
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  private salaTenant(tenantId: string) {
    return `tenant:${tenantId}`;
  }

  emitLeadNuevo(tenantId: string, lead: PrismaLead) {
    this.server?.to(this.salaTenant(tenantId)).emit(SocketEvent.LEAD_NUEVO, { lead });
  }

  emitLeadLiberado(tenantId: string, lead: PrismaLead, motivo: 'timeout' | 'sin_contacto') {
    this.server?.to(this.salaTenant(tenantId)).emit(SocketEvent.LEAD_LIBERADO, { lead, motivo });
  }

  emitLeadAsignado(tenantId: string, lead: PrismaLead, vendedorId: string, automatico: boolean) {
    this.server?.to(this.salaTenant(tenantId)).emit(SocketEvent.LEAD_ASIGNADO, { lead, vendedorId, automatico });
  }
}
