import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportesService } from './reportes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERVISOR)
@Controller('reportes')
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('resumen')
  resumen(@CurrentUser() user: JwtPayload) {
    return this.reportesService.resumenTenant(user.tenantId);
  }

  @Get('ranking-vendedores')
  ranking(@CurrentUser() user: JwtPayload) {
    return this.reportesService.rankingVendedores(user.tenantId);
  }
}
