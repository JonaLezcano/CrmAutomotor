import { IsEnum, IsNumber, Matches, Min } from 'class-validator';
import { TipoCanal } from '@crm/shared';

export class GuardarInversionDto {
  @IsEnum(TipoCanal)
  tipo: TipoCanal;

  // "YYYY-MM" — mismo formato que <input type="month"> del frontend.
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener formato YYYY-MM' })
  periodo: string;

  @IsNumber()
  @Min(0)
  monto: number;
}
