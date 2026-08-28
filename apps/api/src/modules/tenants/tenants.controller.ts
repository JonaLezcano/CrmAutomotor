import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@crm/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // Alta de concesionaria: operación de onboarding de plataforma, sin JWT propio de tenant todavía.
  @Post()
  create(@Body() dto: { nombre: string; marcas: string[]; plan: string }) {
    return this.tenantsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CEO)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CEO)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { nombre?: string; marcas?: string[]; plan?: string }) {
    return this.tenantsService.update(id, dto);
  }
}
