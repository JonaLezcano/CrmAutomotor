import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';

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
}
