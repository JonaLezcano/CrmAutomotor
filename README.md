# CRM Automotor

Implementación del documento de arquitectura (`arquitectura-crm-concesionarias.md`). Monorepo npm workspaces: `apps/api` (NestJS + Prisma/Postgres), `apps/web` (React + Vite), `packages/shared` (tipos TS compartidos), `infra` (docker-compose).

Repo: https://github.com/JonaLezcano/CrmAutomotor (público). El trabajo avanza en commits directos a `master`, uno por cada cambio funcional — no hay convención de branches todavía porque es equipo chico; si eso cambia, se documenta acá.

## Estado actual

Todas las secciones 1-8 del documento están implementadas y **verificadas en vivo** contra Postgres real (no solo compilando):

- Auth JWT (access+refresh, con refresh automático transparente en el frontend), roles jerárquicos (vendedor < supervisor < ceo).
- Ingesta multi-canal (webhook único que normaliza Instagram/WhatsApp/web) con dedup por teléfono+tenant.
- Scoring con regla de palabra clave de compra (prioridad máxima) + reglas configurables por tenant.
- Bolsa con toma libre (lock optimista), auto-asignación por timeout y vuelta a bolsa por falta de contacto (crons cada 1 min).
- Ventas cerrando el ciclo del lead, reportes agregados para supervisor/CEO.
- Notificaciones real-time por WebSocket (salas por tenant) + **Web Push real** (VAPID, service worker, suscripción por dispositivo desde la campanita del header).
- **Row Level Security multi-tenant como barrera real**, no decorativa: roles de Postgres separados (`crm_app` sin BYPASSRLS para requests HTTP, `crm_system` con BYPASSRLS solo para los `@Cron` de sistema) + transacción por request vía `AsyncLocalStorage` (ver `prisma/roles.sql`, `prisma/rls.sql`, `prisma.service.ts`). Probado con un segundo tenant real: cero visibilidad cruzada de canales/leads/usuarios por HTTP.
- **Refresh token en cookie httpOnly** (nunca en el body ni en localStorage): el access token vive solo en memoria y se resuelve solo con un refresh silencioso al recargar la página — verificado con Playwright que ni el refresh ni el access token quedan expuestos en `localStorage`.
- **Sistema visual propio** (tema tablero de auto — la temperatura de un lead es literalmente una luz de tablero, ver `styles/global.css` y `Gauge.tsx`), con nav y cards responsive (se probó en 390px de ancho) y montos formateados en es-AR.
- **Panel de equipo ampliado**: leads por canal, disponibilidad del equipo en vivo, tasa de conversión y tendencia de ventas (14 días) para supervisor+. Para CEO además hay **inversión por canal** (carga manual, no hay integración con Meta/Google Ads todavía) cruzada contra leads/ventas del mes para CPL/CPA/ROAS — es la única parte del panel con datos de plata, por eso queda atrás de un `@Roles(Rol.CEO)` aparte del resto de `/reportes` (supervisor+).

## Primeros pasos (instalación desde cero)

**Requisitos**: [Node.js](https://nodejs.org) 20 o superior, [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo, y `git`.

```bash
git clone https://github.com/JonaLezcano/CrmAutomotor.git
cd CrmAutomotor

npm install                        # instala los 3 workspaces (api/web/shared) de una
npm run build:shared               # OBLIGATORIO antes de levantar la API: @crm/shared
                                    # se resuelve contra su dist/ compilado, que no está
                                    # en el repo (.gitignore) — sin este paso, dev:api
                                    # tira "Cannot find module '@crm/shared'"

npm run infra:up                   # levanta Postgres + Redis (Docker Desktop tiene que estar abierto)

cp apps/api/.env.example apps/api/.env
# completar VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en .env (una sola vez, quedan fijas):
#   cd apps/api && npx web-push generate-vapid-keys

cd apps/api
npx prisma migrate dev --name init
npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
docker exec -i crm-postgres psql -U crm -d crm_automotor < prisma/roles.sql   # crea crm_app/crm_system
npx prisma db seed                 # crea tenant demo + usuario admin/admin1234

cd ../..
npm run dev:api                    # http://localhost:3001/api
npm run dev:web                    # http://localhost:5173, login admin/admin1234
```

Con eso ya queda todo levantado local. Los dos `npm run dev:*` quedan corriendo en
primer plano (dos terminales distintas, o `run_in_background` si usás Claude Code) —
recargan solos ante cualquier cambio de código.

**Si algo falla en el camino:**
- `EADDRINUSE` en el puerto 3001/5173 → ya hay algo corriendo ahí (otra instancia
  vieja de `dev:api`/`dev:web` que quedó colgada); cerrarla y reintentar.
- `EPERM`/archivo bloqueado al correr `npx prisma generate` → el propio `dev:api`
  en watch-mode tiene el motor de Prisma abierto; pararlo, generar, y volver a
  levantarlo.
- Docker Desktop no arranca → reiniciar Windows suele resolverlo; confirmar que
  WSL2 esté actualizado (`wsl --update`).

## Tests

`npm test --workspace=apps/api` corre los 17 tests unitarios (scoring, roles, dedup).

Los tests end-to-end pegan por HTTP real (supertest) contra Postgres real, con RLS
y roles de Postgres aplicados — cubren el flujo completo de la sección 5
(ingesta → dedup → scoring → bolsa con lock optimista → asignación → venta),
aislamiento entre tenants, y una regresión específica del cron de
auto-asignación bajo RLS real. Corren contra una base separada
(`crm_automotor_test`) para no tocar los datos de desarrollo:

```bash
docker exec crm-postgres psql -U crm -d postgres -c "CREATE DATABASE crm_automotor_test OWNER crm;"  # una sola vez

cd apps/api
DATABASE_URL="postgresql://crm:crm_dev_password@localhost:5432/crm_automotor_test?schema=public" npx prisma migrate deploy
docker exec -i crm-postgres psql -U crm -d crm_automotor_test < prisma/rls.sql
docker exec -i crm-postgres psql -U crm -d crm_automotor_test < prisma/roles.sql

npm run test:e2e                   # apps/api/.env.test ya trae credenciales de test propias
```

## Pendientes explícitos (marcados en el código con TODO)

Estos son parámetros que el documento deja abiertos ("pendiente de definir con Jona") o gaps reales encontrados al implementar — no son bugs, son decisiones que faltan:

1. **Horas de decaimiento de temperatura** (sección 9.5) — `scoring.service.ts`, default provisorio.
2. **Plazo sin contacto antes de volver a bolsa** (sección 5, paso 6) — `bolsa.service.ts`, default 30 min.
3. **Instagram no entrega teléfono real** (solo PSID) — la dedup por teléfono no fusiona un lead de Instagram con el mismo lead si escribe después por WhatsApp. `canales.controller.ts`.

## Próximos roles (sección 10 del documento)

Con RLS real, push, la cobertura e2e, el refresh token en cookie httpOnly y el pulido de UX ya cerrados, lo que queda es profundizar cada módulo (paginación, filtros, manejo de errores más fino) — no hay ningún punto de arquitectura pendiente.
