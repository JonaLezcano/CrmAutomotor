import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';
import { SuscribirPushDto } from './dto/suscribir-push.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.VENDEDOR)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get()
  noLeidas(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.findNoLeidas(user.sub);
  }

  @Patch(':id/leido')
  marcarLeido(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificacionesService.marcarLeido(id, user.sub);
  }

  // No expone nada sensible (es la clave PÚBLICA), pero igual queda atrás del
  // JwtAuthGuard de la clase: el frontend recién la pide después de loguearse.
  @Get('push/vapid-public-key')
  vapidPublicKey() {
    return this.notificacionesService.vapidPublicKey();
  }

  @Post('push/suscripcion')
  suscribirPush(@CurrentUser() user: JwtPayload, @Body() sub: SuscribirPushDto) {
    return this.notificacionesService.guardarSuscripcion(user.sub, sub);
  }

  @Delete('push/suscripcion')
  desuscribirPush(@CurrentUser() user: JwtPayload, @Body('endpoint') endpoint: string) {
    return this.notificacionesService.eliminarSuscripcion(user.sub, endpoint);
  }
}
