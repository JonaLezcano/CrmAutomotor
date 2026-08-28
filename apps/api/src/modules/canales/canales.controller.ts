import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol, TipoCanal } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CanalesService } from './canales.service';
import { CreateCanalDto } from './dto/create-canal.dto';
import { LeadsService } from '../leads/leads.service';

@Controller('canales')
export class CanalesController {
  constructor(
    private canalesService: CanalesService,
    private leadsService: LeadsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CEO)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCanalDto) {
    return this.canalesService.create(user.tenantId, dto.tipo, dto.config ?? {});
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.SUPERVISOR)
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.canalesService.findByTenant(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CEO)
  @Patch(':id/activo')
  setActivo(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.canalesService.setActivo(id, activo);
  }

  // Handshake de verificación de Meta (Instagram/WhatsApp Cloud API): responde
  // el hub.challenge si el hub.verify_token coincide con el configurado.
  @Get('webhook/:canalId')
  verify(@Param('canalId') canalId: string, @Query() query: Record<string, string>) {
    return query['hub.challenge'] ?? 'ok';
  }

  // Punto único de entrada de leads de cualquier canal (sección 5, paso 1).
  // Sin JWT: la identidad viene del canalId de la URL (unguessable UUID),
  // resolveCanalParaWebhook además fija el tenant context para RLS.
  @Post('webhook/:canalId')
  async recibirWebhook(@Param('canalId') canalId: string, @Body() body: Record<string, any>) {
    const canal = await this.canalesService.resolveCanalParaWebhook(canalId);
    const normalizado = this.normalizar(canal.tipo, body);
    return this.leadsService.ingest(canal.tenantId, canal.id, normalizado);
  }

  /** Cada canal manda un shape distinto; acá se homogeneiza a {telefono,nombre,mensaje}. */
  private normalizar(tipo: TipoCanal, body: Record<string, any>) {
    switch (tipo) {
      case TipoCanal.whatsapp:
        // Meta WhatsApp Cloud API: entry[0].changes[0].value.messages[0]
        return {
          telefono: body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ?? body.telefono,
          nombre: body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name,
          mensaje: body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ?? '',
        };
      case TipoCanal.instagram:
        // Meta Instagram Messaging API: entry[0].messaging[0]. OJO: Instagram
        // no entrega un teléfono real, solo un PSID (sender.id) — la dedup por
        // "telefono" (sección 4) no fusiona un lead de Instagram con el mismo
        // lead si después escribe por WhatsApp, salvo que se pida el teléfono
        // explícitamente en la conversación. Pendiente de decidir con Jona.
        return {
          telefono: body?.entry?.[0]?.messaging?.[0]?.sender?.id ?? body.telefono,
          nombre: body.nombre,
          mensaje: body?.entry?.[0]?.messaging?.[0]?.message?.text ?? '',
        };
      case TipoCanal.web:
      default:
        return { telefono: body.telefono, nombre: body.nombre, mensaje: body.mensaje ?? '' };
    }
  }
}
