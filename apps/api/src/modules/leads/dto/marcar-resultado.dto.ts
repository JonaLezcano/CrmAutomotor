import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoLead } from '@crm/shared';

export class MarcarResultadoDto {
  @IsEnum(EstadoLead)
  estado: EstadoLead;

  @IsOptional()
  @IsString()
  detalle?: string;
}
