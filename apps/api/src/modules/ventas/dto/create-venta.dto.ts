import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVentaDto {
  @IsUUID()
  leadId: string;

  @IsString() @IsNotEmpty() auto: string;
  @IsString() @IsNotEmpty() modelo: string;
  @IsString() @IsNotEmpty() plan: string;

  @IsOptional() @IsNumber() cuota?: number;
  @IsNumber() monto: number;
}
