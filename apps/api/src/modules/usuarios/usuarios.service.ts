import { Injectable } from '@nestjs/common';
import { EstadoDisponibilidad } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  // Alta de usuarios: exclusiva de CEO (sección 6), guardia se aplica en el controller.
  async create(tenantId: string, dto: CreateUsuarioDto) {
    const passwordHash = await this.authService.hashPassword(dto.password);
    return this.prisma.usuario.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        dni: dto.dni,
        telefono: dto.telefono,
        sector: dto.sector,
        usuario: dto.usuario,
        passwordHash,
        rol: dto.rol,
      },
      select: { id: true, nombre: true, usuario: true, rol: true, tenantId: true },
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.usuario.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, usuario: true, rol: true, estadoDisponibilidad: true },
    });
  }

  // Cada vendedor marca su propia disponibilidad (sección 6); esto determina
  // quién entra al pool de "vendedor disponible" que arma bolsa.service.ts.
  setDisponibilidad(usuarioId: string, estado: EstadoDisponibilidad) {
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { estadoDisponibilidad: estado },
    });
  }

  findDisponibles(tenantId: string) {
    return this.prisma.usuario.findMany({
      where: { tenantId, rol: 'vendedor', estadoDisponibilidad: 'disponible' },
    });
  }
}
