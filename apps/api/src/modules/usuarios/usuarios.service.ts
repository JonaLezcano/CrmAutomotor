import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    try {
      return await this.prisma.usuario.create({
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
    } catch (err) {
      // `usuario` es único a nivel global (sección 4, necesario para el
      // login sin tenant todavía) — sin este catch, elegir un nombre ya
      // tomado (de cualquier concesionaria) tiraba un 500 genérico en vez
      // de decir cuál es el problema real.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`El usuario "${dto.usuario}" ya está en uso`);
      }
      throw err;
    }
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
