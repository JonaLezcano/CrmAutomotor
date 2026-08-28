import { IsEnum } from 'class-validator';
import { EstadoDisponibilidad } from '@crm/shared';

export class UpdateDisponibilidadDto {
  @IsEnum(EstadoDisponibilidad)
  estadoDisponibilidad: EstadoDisponibilidad;
}
