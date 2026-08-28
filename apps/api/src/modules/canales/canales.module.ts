import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { CanalesController } from './canales.controller';
import { CanalesService } from './canales.service';

@Module({
  imports: [LeadsModule],
  controllers: [CanalesController],
  providers: [CanalesService],
  exports: [CanalesService],
})
export class CanalesModule {}
