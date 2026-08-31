import { Type } from 'class-transformer';
import { IsString, IsUrl, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

export class SuscribirPushDto {
  @IsUrl({ require_tld: false })
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
