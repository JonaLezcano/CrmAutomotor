import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [ScoringModule, NotificacionesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
