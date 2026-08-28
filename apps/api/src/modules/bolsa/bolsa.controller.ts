import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BolsaService } from './bolsa.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bolsa')
export class BolsaController {
  constructor(private bolsaService: BolsaService) {}

  @Roles(Rol.VENDEDOR)
  @Post(':leadId/tomar')
  tomar(@Param('leadId') leadId: string, @CurrentUser() user: JwtPayload) {
    return this.bolsaService.tomar(leadId, user.tenantId, user.sub);
  }

  // Asignación manual (sección 6: exclusiva de supervisor/CEO).
  @Roles(Rol.SUPERVISOR)
  @Post(':leadId/asignar')
  asignar(@Param('leadId') leadId: string, @CurrentUser() user: JwtPayload, @Body('vendedorId') vendedorId: string) {
    return this.bolsaService.asignarManual(leadId, user.tenantId, vendedorId);
  }
}
