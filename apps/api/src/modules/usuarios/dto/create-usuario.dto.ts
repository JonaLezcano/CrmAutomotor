import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Rol } from '@crm/shared';

export class CreateUsuarioDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsString() @IsNotEmpty() dni: string;
  @IsString() @IsNotEmpty() telefono: string;
  @IsString() @IsNotEmpty() sector: string;
  @IsString() @IsNotEmpty() usuario: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(Rol) rol: Rol;
}
