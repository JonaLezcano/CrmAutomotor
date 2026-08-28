import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateDisponibilidadDto } from './dto/update-disponibilidad.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Roles(Rol.CEO)
  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(user.tenantId, dto);
  }

  @Roles(Rol.VENDEDOR)
  @Get()
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.usuariosService.findByTenant(user.tenantId);
  }

  @Roles(Rol.VENDEDOR)
  @Patch('disponibilidad')
  setDisponibilidad(@CurrentUser() user: { sub: string }, @Body() dto: UpdateDisponibilidadDto) {
    return this.usuariosService.setDisponibilidad(user.sub, dto.estadoDisponibilidad);
  }
}
