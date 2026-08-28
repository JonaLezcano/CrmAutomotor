import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { MarcarResultadoDto } from './dto/marcar-resultado.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.VENDEDOR)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get('bolsa')
  bolsa(@CurrentUser() user: JwtPayload) {
    return this.leadsService.findBolsa(user.tenantId);
  }

  @Get('mis')
  misLeads(@CurrentUser() user: JwtPayload) {
    return this.leadsService.findAsignadosA(user.sub);
  }

  @Patch(':id/resultado')
  marcarResultado(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: MarcarResultadoDto) {
    return this.leadsService.marcarResultado(id, user.sub, dto.estado, dto.detalle);
  }
}
