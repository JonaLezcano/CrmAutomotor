import { IsNotEmpty, IsString } from 'class-validator';
import { LoginRequest } from '@crm/shared';

export class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty()
  usuario: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
