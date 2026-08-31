import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportesService } from './reportes.service';
import { GuardarInversionDto } from './dto/guardar-inversion.dto';

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

  @Get('tendencia-ventas')
  tendenciaVentas(@CurrentUser() user: JwtPayload) {
    return this.reportesService.tendenciaVentas(user.tenantId);
  }

  // Plata invertida y CPA/ROAS por canal: dato de negocio sensible, exclusivo
  // de CEO (a diferencia del resto de /reportes, que es supervisor+) — el
  // @Roles de acá abajo pisa el de la clase.
  @Roles(Rol.CEO)
  @Get('inversion-canales')
  inversionCanales(@CurrentUser() user: JwtPayload, @Query('periodo') periodo?: string) {
    return this.reportesService.inversionPorCanal(user.tenantId, periodo);
  }

  @Roles(Rol.CEO)
  @Post('inversion-canales')
  guardarInversion(@CurrentUser() user: JwtPayload, @Body() dto: GuardarInversionDto) {
    return this.reportesService.guardarInversion(user.tenantId, dto.tipo, dto.periodo, dto.monto);
  }
}
