import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtPayload, Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.VENDEDOR)
@Controller('ventas')
export class VentasController {
  constructor(private ventasService: VentasService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVentaDto) {
    return this.ventasService.create(user.tenantId, user.sub, dto);
  }

  @Get('mis')
  misVentas(@CurrentUser() user: JwtPayload) {
    return this.ventasService.findByVendedor(user.sub);
  }
}
