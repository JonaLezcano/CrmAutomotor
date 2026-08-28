import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { TipoCanal } from '@crm/shared';

export class CreateCanalDto {
  @IsEnum(TipoCanal)
  tipo: TipoCanal;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
