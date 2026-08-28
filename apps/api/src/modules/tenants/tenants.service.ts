import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  // Alta de concesionaria: corre fuera del contexto RLS de un tenant existente
  // (todavía no hay tenant_id de sesión), por eso no pasa por TenantContextInterceptor.
  create(data: { nombre: string; marcas: string[]; plan: string }) {
    return this.prisma.tenant.create({ data });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  update(id: string, data: Partial<{ nombre: string; marcas: string[]; plan: string }>) {
    return this.prisma.tenant.update({ where: { id }, data });
  }
}
