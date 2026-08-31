import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { tenantContextStorage } from './tenant-context.storage';

// Cuánto puede durar como máximo la transacción que envuelve un request
// completo (ver TenantContextInterceptor). Todos los endpoints de esta app
// son CRUD simple — 10s da margen de sobra sin dejar una conexión pooleada
// tomada indefinidamente si algo se cuelga.
const TIMEOUT_TRANSACCION_REQUEST_MS = 10_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Rol de runtime SIN BYPASSRLS (a diferencia de PrismaSystemService) —
    // ver prisma/roles.sql. Si DATABASE_URL_APP no está seteada todavía
    // (falta correr roles.sql), cae a DATABASE_URL por las dudas de que
    // exista algo con qué conectar, pero en ese caso RLS queda inerte
    // (ver el aviso en onModuleInit).
    super({ datasourceUrl: process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL });
  }

  async onModuleInit() {
    await this.$connect();

    if (!process.env.DATABASE_URL_APP) {
      this.logger.warn(
        'DATABASE_URL_APP no está seteada — usando DATABASE_URL (rol superusuario) para runtime. ' +
          'RLS queda inerte (un superusuario/dueño de tabla la bypassea siempre). Correr prisma/roles.sql y setear DATABASE_URL_APP.',
      );
    }

    // Redirige cada query de modelo a la transacción de la request actual
    // (tenantContextStorage, llenada por TenantContextInterceptor) en vez de
    // dejarla tomar cualquier conexión libre del pool. Sin esto, `SET LOCAL
    // app.tenant_id` de la transacción no tiene forma de alcanzar a las
    // queries que hacen los services — quedaría corrido en una conexión que
    // nadie más vuelve a tocar. $use está deprecado desde Prisma 5 a favor
    // de Client Extensions, pero extends() devuelve un tipo nuevo que
    // rompería la inyección de `PrismaService` en los ~15 services que la
    // usan; se prioriza no tocar esos archivos. Reevaluar al migrar a
    // Prisma 6 (ahí $use ya no existe).
    this.$use(async (params, next) => {
      // `tx` sale del mismo cliente base, así que comparte esta cadena de
      // $use — la llamada redirigida de abajo (store.tx.model.action())
      // vuelve a pasar por acá. `runInTransaction` es la única señal
      // confiable para cortar la recursión: al principio probé salir del
      // contexto con tenantContextStorage.exit(), pero Prisma difiere la
      // ejecución real de la query (no es una promise normal), así que para
      // cuando efectivamente corre el ALS ya había vuelto a entrar en
      // contexto — quedaba recursando de verdad (un request colgado llegó a
      // consumir >2GB antes de matarlo).
      if (params.runInTransaction) return next(params);

      const store = tenantContextStorage.getStore();
      if (!store || !params.model) return next(params);

      const nombreDelegate = params.model.charAt(0).toLowerCase() + params.model.slice(1);
      const delegate = (store.tx as unknown as Record<string, Record<string, (args: unknown) => unknown>>)[
        nombreDelegate
      ];
      return delegate[params.action](params.args);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Abre la transacción de un request autenticado: corre `SET LOCAL
   * app.tenant_id` como primera sentencia y ejecuta `fn` con ese tenant ya
   * fijado para TODAS las queries que hagan los services durante `fn`
   * (vía tenantContextStorage + el $use de arriba). La transacción se
   * commitea recién cuando `fn` termina — o sea, dura lo mismo que el
   * request HTTP completo. Llamado únicamente desde TenantContextInterceptor.
   */
  async ejecutarComoTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
        return tenantContextStorage.run({ tx }, fn);
      },
      { timeout: TIMEOUT_TRANSACCION_REQUEST_MS },
    );
  }

  /**
   * Para queries fuera de un request HTTP (el webhook de canales, sin JWT
   * todavía) que necesitan fijar el tenant a mano — ver
   * canales.service.ts → resolveCanalParaWebhook. No abre una transacción
   * de request completo: solo corre en la conexión que Prisma le dé para
   * esta única sentencia raw, así que el código que la llama debe seguir
   * usando `this.prisma` directo (no `tx`) para las queries siguientes,
   * confiando en `where: { tenantId }` explícito como barrera real — el
   * mismo caso ya documentado antes de este fix para el resto del código.
   */
  async setTenantContext(tenantId: string) {
    await this.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
  }
}
