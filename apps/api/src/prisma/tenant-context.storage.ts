import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';

export interface TenantContextStore {
  tx: Prisma.TransactionClient;
}

/**
 * Lleva la transacción Postgres de la request actual (abierta por
 * TenantContextInterceptor, con `SET LOCAL app.tenant_id` ya corrido como
 * primera sentencia) a través de toda la cadena de `await`s de un request
 * — controller → service → PrismaService — sin tener que pasar `tx` a mano
 * por cada método. PrismaService la usa (ver $use en prisma.service.ts)
 * para redirigir ahí cada query en vez de usar una conexión pooleada nueva,
 * que es la única forma de que RLS (rls.sql) sea una barrera real y no solo
 * defensa en profundidad.
 */
export const tenantContextStorage = new AsyncLocalStorage<TenantContextStore>();
