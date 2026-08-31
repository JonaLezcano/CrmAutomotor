import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // credentials:true + origin explícito (nunca '*' — el browser lo rechaza
  // en requests con cookies) para que el refresh token en cookie httpOnly
  // (ver auth.controller.ts) vaya y vuelva en cross-origin real (prod: front
  // y back en dominios distintos). En dev, el proxy de Vite hace que sea
  // same-origin igual, así que esto no cambia nada localmente.
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? [], credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`CRM Automotor API escuchando en http://localhost:${port}/api`);
}

bootstrap();
