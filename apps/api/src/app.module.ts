import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CanalesModule } from './modules/canales/canales.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { BolsaModule } from './modules/bolsa/bolsa.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsuariosModule,
    CanalesModule,
    LeadsModule,
    ScoringModule,
    BolsaModule,
    VentasModule,
    NotificacionesModule,
    ReportesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
