import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente separado para jobs de sistema (cron de bolsa.service.ts) que necesitan
 * ver leads de TODOS los tenants a la vez — algo que las políticas RLS de
 * prisma/rls.sql bloquean a propósito para requests HTTP normales (sección 8).
 *
 * Se conecta con DATABASE_URL_SYSTEM, un rol de Postgres con BYPASSRLS. Es
 * código de confianza (no toca input de usuario), así que saltarse RLS acá es
 * intencional — pero el rol de la conexión normal (DATABASE_URL, usada por
 * PrismaService) NO debe tener BYPASSRLS, o las políticas quedan decorativas.
 *
 * En dev, docker-compose crea un único usuario `crm` que de hecho ya bypassea
 * RLS (es el dueño de la DB) — las dos URLs pueden apuntar a lo mismo sin que
 * se note el problema. Antes de staging: crear los dos roles reales, sacarle
 * BYPASSRLS a `crm_app`, y confirmar con un test que un tenant no ve leads de
 * otro por la vía HTTP normal. Ver TODO de "Seguridad" en sección 10 del doc
 * de arquitectura.
 */
@Injectable()
export class PrismaSystemService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasourceUrl: process.env.DATABASE_URL_SYSTEM ?? process.env.DATABASE_URL });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
