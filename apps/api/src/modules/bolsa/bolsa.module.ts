import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { BolsaController } from './bolsa.controller';
import { BolsaService } from './bolsa.service';

@Module({
  imports: [UsuariosModule, NotificacionesModule],
  controllers: [BolsaController],
  providers: [BolsaService],
  exports: [BolsaService],
})
export class BolsaModule {}
