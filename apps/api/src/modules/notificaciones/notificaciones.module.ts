import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificacionesController],
  providers: [NotificacionesGateway, NotificacionesService],
  exports: [NotificacionesGateway, NotificacionesService],
})
export class NotificacionesModule {}
