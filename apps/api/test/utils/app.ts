import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';

/** Arma la app completa (mismos pipes/middleware/prefijo que main.ts) para pegarle por HTTP con supertest. */
export async function crearAppDeTest(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();

  // Los @Cron de bolsa.service.ts arrancan solos con la app — en un test que
  // puede tardar más de un minuto de wall-clock, el timer real podría
  // disparar en paralelo con lo que el test arma a mano y pisarlo. Se paran
  // acá; los tests que quieren probar el cron llaman al método directamente
  // (ver flujo-completo.e2e-spec.ts).
  const scheduler = app.get(SchedulerRegistry);
  for (const job of scheduler.getCronJobs().values()) job.stop();

  return app;
}
