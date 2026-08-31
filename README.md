# CRM Automotor

Implementación del documento de arquitectura (`arquitectura-crm-concesionarias.md`). Monorepo npm workspaces: `apps/api` (NestJS + Prisma/Postgres), `apps/web` (React + Vite), `packages/shared` (tipos TS compartidos), `infra` (docker-compose).

## Estado actual

Todas las secciones 1-8 del documento están implementadas y **verificadas en vivo** contra Postgres real (no solo compilando):

- Auth JWT (access+refresh, con refresh automático transparente en el frontend), roles jerárquicos (vendedor < supervisor < ceo).
- Ingesta multi-canal (webhook único que normaliza Instagram/WhatsApp/web) con dedup por teléfono+tenant.
- Scoring con regla de palabra clave de compra (prioridad máxima) + reglas configurables por tenant.
- Bolsa con toma libre (lock optimista), auto-asignación por timeout y vuelta a bolsa por falta de contacto (crons cada 1 min).
- Ventas cerrando el ciclo del lead, reportes agregados para supervisor/CEO.
- Notificaciones real-time por WebSocket (salas por tenant) + **Web Push real** (VAPID, service worker, suscripción por dispositivo desde la campanita del header).
- **Row Level Security multi-tenant como barrera real**, no decorativa: roles de Postgres separados (`crm_app` sin BYPASSRLS para requests HTTP, `crm_system` con BYPASSRLS solo para los `@Cron` de sistema) + transacción por request vía `AsyncLocalStorage` (ver `prisma/roles.sql`, `prisma/rls.sql`, `prisma.service.ts`). Probado con un segundo tenant real: cero visibilidad cruzada de canales/leads/usuarios por HTTP.

## Primeros pasos

```bash
npm install                        # ya corrido; dejar por las dudas
npm run infra:up                   # levanta Postgres + Redis (requiere Docker Desktop corriendo)

cp apps/api/.env.example apps/api/.env
# completar VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en .env (una vez por entorno):
#   npx web-push generate-vapid-keys

cd apps/api
npx prisma migrate dev --name init
npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
docker exec -i crm-postgres psql -U crm -d crm_automotor < prisma/roles.sql   # crea crm_app/crm_system
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
4. **JWT en localStorage** (`apps/web/src/store/auth.ts`) — legible por XSS; evaluar cookie httpOnly antes de producción.

## Próximos roles (sección 10 del documento)

Con RLS real y push ya cerrados, lo que queda es más acotado:

- **QA**: escribir tests del flujo completo (ingesta → dedup → scoring → bolsa → asignación → venta); hoy solo hay 17 tests unitarios (scoring, roles, un pedazo de leads), sin cobertura end-to-end.
- **Seguridad**: punto 4 de arriba (JWT en localStorage → evaluar cookie httpOnly) antes de producción.
- **UX/UI**: el frontend es funcional pero sin diseño (estilos inline mínimos); definir el sistema visual real, empezando por los colores de temperatura de sección 9.5.
- **Backend/Frontend**: profundizar cada módulo (paginación, filtros, manejo de errores más fino).
