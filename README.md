# CRM Automotor

Implementación del documento de arquitectura (`arquitectura-crm-concesionarias.md`). Monorepo npm workspaces: `apps/api` (NestJS + Prisma/Postgres), `apps/web` (React + Vite), `packages/shared` (tipos TS compartidos), `infra` (docker-compose).

## Estado actual

Scaffold funcional y tipado de punta a punta (`npm run build:shared/api/web` compilan sin errores), con la lógica central de las secciones 1-8 del documento implementada:

- Auth JWT (access+refresh), roles jerárquicos (vendedor < supervisor < ceo).
- Ingesta multi-canal (webhook único que normaliza Instagram/WhatsApp/web) con dedup por teléfono+tenant.
- Scoring con regla de palabra clave de compra (prioridad máxima) + reglas configurables por tenant.
- Bolsa con toma libre (lock optimista), auto-asignación por timeout y vuelta a bolsa por falta de contacto (crons cada 1 min).
- Ventas cerrando el ciclo del lead, reportes agregados para supervisor/CEO.
- Notificaciones real-time por WebSocket (salas por tenant) + esqueleto de push.
- Row Level Security multi-tenant (`prisma/rls.sql`), con sus límites documentados (ver abajo).

No se corrió nunca contra una base real en esta sesión (sin Docker disponible en el entorno) — el próximo paso es levantarlo local y probarlo.

## Primeros pasos

```bash
npm install                        # ya corrido; dejar por las dudas
npm run infra:up                   # levanta Postgres + Redis (requiere Docker Desktop corriendo)

cp apps/api/.env.example apps/api/.env

cd apps/api
npx prisma migrate dev --name init
npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
npx prisma db seed                 # crea tenant demo + usuario admin/admin1234

cd ../..
npm run dev:api                    # http://localhost:3001/api
npm run dev:web                    # http://localhost:5173, login admin/admin1234
```

## Pendientes explícitos (marcados en el código con TODO)

Estos son parámetros que el documento deja abiertos ("pendiente de definir con Jona") o gaps reales encontrados al implementar — no son bugs, son decisiones que faltan:

1. **Horas de decaimiento de temperatura** (sección 9.5) — `scoring.service.ts`, default provisorio.
2. **Plazo sin contacto antes de volver a bolsa** (sección 5, paso 6) — `bolsa.service.ts`, default 30 min.
3. **Instagram no entrega teléfono real** (solo PSID) — la dedup por teléfono no fusiona un lead de Instagram con el mismo lead si escribe después por WhatsApp. `canales.controller.ts`.
4. **RLS como barrera real, no solo defensa en profundidad** — por el pooling de conexiones de Prisma, `set_config` por request no se propaga de forma confiable entre todas las queries de un mismo request. Hoy la barrera real es el `where: { tenantId }` explícito en cada service; RLS protege queries ad-hoc/directas a la DB. Ver el comentario largo en `apps/api/src/prisma/prisma.service.ts`. Antes de confiar en RLS como única garantía hace falta envolver cada request en una transacción con `SET LOCAL` y pasarla vía AsyncLocalStorage.
5. **Roles de Postgres para RLS** — dev usa el superusuario `crm` de docker-compose para todo (bypassea RLS sin que se note). Antes de staging: crear `crm_app` (sin BYPASSRLS) y `crm_system` (con BYPASSRLS, para los cron de `bolsa.service.ts`) como roles separados — instrucciones en `prisma/rls.sql`.
6. **Push (Web Push/FCM)** — `notificaciones.service.ts` tiene el punto de enganche pero es un stub; falta registrar suscripciones por usuario y cablear credenciales.
7. **JWT en localStorage** (`apps/web/src/store/auth.ts`) — legible por XSS; evaluar cookie httpOnly antes de producción.

## Próximos roles (sección 10 del documento)

Con el esqueleto funcionando localmente, el orden natural es:

- **Seguridad**: resolver los puntos 4 y 5 de arriba antes que nada — es la premisa de todo el aislamiento multi-tenant.
- **QA**: escribir tests del flujo completo (ingesta → dedup → scoring → bolsa → asignación → venta); hoy no hay tests.
- **UX/UI**: el frontend actual es funcional pero sin diseño (estilos inline mínimos); definir el sistema visual real, empezando por los colores de temperatura de sección 9.5.
- **Backend/Frontend**: profundizar cada módulo (paginación, filtros, manejo de errores más fino, registro de suscripciones push).
