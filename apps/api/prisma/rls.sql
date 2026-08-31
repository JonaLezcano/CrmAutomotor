-- Row Level Security multi-tenant (arquitectura-crm-concesionarias.md, sección 8).
-- Prisma no puede generar políticas RLS desde schema.prisma, así que este SQL
-- se corre a mano después de la primera migración, como el superusuario de
-- DATABASE_URL (nunca como crm_app/crm_system):
--   npx prisma migrate dev --name init
--   npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
--   docker exec -i crm-postgres psql -U crm -d crm_automotor -f - < prisma/roles.sql
--
-- Idempotente: se puede volver a correr entero sin romper nada si se agrega
-- una tabla/política nueva más adelante.
--
-- La app setea el tenant actual por conexión con:
--   SELECT set_config('app.tenant_id', $1, true);
-- corrido como primera sentencia de la transacción que envuelve cada
-- request (ver TenantContextInterceptor + PrismaService.ejecutarComoTenant).
--
-- roles.sql crea crm_app (sin BYPASSRLS, para requests HTTP normales) y
-- crm_system (con BYPASSRLS, para los cron de bolsa.service.ts) — sin eso,
-- todo lo de abajo queda inerte, porque un superusuario/dueño de tabla
-- bypassea RLS siempre.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE canales ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_reglas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones_canal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_usuarios ON usuarios;
CREATE POLICY tenant_isolation_usuarios ON usuarios
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_canales ON canales;
CREATE POLICY tenant_isolation_canales ON canales
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_leads ON leads;
CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_scoring_reglas ON scoring_reglas;
CREATE POLICY tenant_isolation_scoring_reglas ON scoring_reglas
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_inversiones_canal ON inversiones_canal;
CREATE POLICY tenant_isolation_inversiones_canal ON inversiones_canal
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- lead_eventos, ventas y notificaciones no tienen tenant_id propio: heredan el
-- aislamiento por join implícito (lead_id / usuario_id ya están filtrados),
-- pero igual quedan con RLS habilitado y política vía subquery para defensa en profundidad.
DROP POLICY IF EXISTS tenant_isolation_lead_eventos ON lead_eventos;
CREATE POLICY tenant_isolation_lead_eventos ON lead_eventos
  USING (
    lead_id IN (SELECT id FROM leads WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

DROP POLICY IF EXISTS tenant_isolation_ventas ON ventas;
CREATE POLICY tenant_isolation_ventas ON ventas
  USING (
    lead_id IN (SELECT id FROM leads WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

DROP POLICY IF EXISTS tenant_isolation_notificaciones ON notificaciones;
CREATE POLICY tenant_isolation_notificaciones ON notificaciones
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

DROP POLICY IF EXISTS tenant_isolation_push_suscripciones ON push_suscripciones;
CREATE POLICY tenant_isolation_push_suscripciones ON push_suscripciones
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

-- `tenants` es especial: la fila ES el tenant (no tiene columna tenant_id
-- propia, su `id` cumple ese rol). Un usuario logueado solo puede ver/tocar
-- SU PROPIA fila de tenant (ej. GET/PATCH /tenants/:id, sección 6). El INSERT
-- es alta de una concesionaria nueva (POST /tenants) — pasa SIN JWT todavía
-- (nadie tiene cuenta ahí hasta que se cree el primer usuario), mismo problema
-- de huevo-y-gallina que canales/usuarios, pero acá no hace falta una función
-- SECURITY DEFINER: insertar una fila nueva no puede filtrar datos de nadie
-- más, así que WITH CHECK (true) es seguro. (Aparte, pendiente marcado en
-- tenants.controller.ts: ese endpoint hoy no tiene NINGÚN guard — cualquiera
-- puede crear tenants sin autenticarse. Es un tema de autorización de
-- plataforma, no de RLS; no se toca acá.)
DROP POLICY IF EXISTS tenant_isolation_tenants_select ON tenants;
CREATE POLICY tenant_isolation_tenants_select ON tenants
  FOR SELECT USING (id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_tenants_update ON tenants;
CREATE POLICY tenant_isolation_tenants_update ON tenants
  FOR UPDATE USING (id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_creation_tenants_insert ON tenants;
CREATE POLICY tenant_creation_tenants_insert ON tenants
  FOR INSERT WITH CHECK (true);

-- Los webhooks de ingesta (Meta API / form web) llegan SIN JWT, así que todavía
-- no hay app.tenant_id fijado en la sesión cuando canales.service necesita
-- resolver a qué tenant pertenece el canalId de la URL — y bajo RLS estricto
-- esa lectura devolvería 0 filas (huevo y gallina). Esta función SECURITY
-- DEFINER es la única forma autorizada de leer canales sin contexto de tenant:
-- solo permite lookup puntual por id (nunca un listado), así que no habilita
-- enumerar canales de otros tenants. Después de llamarla, el código SIEMPRE
-- debe fijar app.tenant_id con el resultado antes de tocar cualquier otra tabla
-- (ver canales.service.ts → resolveCanalParaWebhook).
-- Nota: los id son TEXT (default de Prisma para `String @id @default(uuid())`,
-- no el tipo nativo `uuid` de Postgres), por eso la función usa text acá.
CREATE OR REPLACE FUNCTION resolve_canal_publico(p_canal_id text)
RETURNS TABLE (id text, tenant_id text, tipo "TipoCanal", activo boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, tipo, activo FROM canales WHERE id = p_canal_id;
$$;

REVOKE ALL ON FUNCTION resolve_canal_publico(text) FROM PUBLIC;

-- Mismo problema que el de arriba, pero para el login (auth.service.ts):
-- `usuario` es único a nivel GLOBAL a propósito (sección 4), justamente
-- para poder buscarlo sin saber todavía a qué tenant pertenece — es el
-- primer paso antes de que exista cualquier app.tenant_id. Solo expone lo
-- mínimo para validar credenciales y armar el JWT; nunca password_hash de
-- más de una fila a la vez, ni un listado.
CREATE OR REPLACE FUNCTION resolve_usuario_login(p_usuario text)
RETURNS TABLE (id text, tenant_id text, nombre text, password_hash text, rol "Rol")
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, nombre, password_hash, rol FROM usuarios WHERE usuario = p_usuario;
$$;

REVOKE ALL ON FUNCTION resolve_usuario_login(text) FROM PUBLIC;
