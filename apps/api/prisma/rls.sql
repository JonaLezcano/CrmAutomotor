-- Row Level Security multi-tenant (arquitectura-crm-concesionarias.md, sección 8).
-- Prisma no puede generar políticas RLS desde schema.prisma, así que este SQL
-- se corre a mano después de la primera migración:
--   npx prisma migrate dev --name init
--   npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
--
-- La app setea el tenant actual por conexión con:
--   SELECT set_config('app.tenant_id', $1, true);
-- (ver apps/api/src/prisma/prisma.service.ts)
--
-- ANTES DE STAGING (tarea del rol "Seguridad" de la sección 10): crear dos
-- roles reales en vez de usar el superusuario `crm` de docker-compose para
-- todo, porque un superuser bypassea RLS y las políticas de abajo quedan sin
-- efecto sin que se note en dev:
--   CREATE ROLE crm_app LOGIN PASSWORD '...';               -- DATABASE_URL, sin BYPASSRLS
--   CREATE ROLE crm_system LOGIN PASSWORD '...' BYPASSRLS;  -- DATABASE_URL_SYSTEM, para bolsa.service.ts (@Cron)
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO crm_app, crm_system;
-- Después, correr un test de humo autenticado como dos tenants distintos y
-- confirmar que ninguno ve leads/usuarios del otro por HTTP.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE canales ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_reglas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_usuarios ON usuarios
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_canales ON canales
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_scoring_reglas ON scoring_reglas
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- lead_eventos, ventas y notificaciones no tienen tenant_id propio: heredan el
-- aislamiento por join implícito (lead_id / usuario_id ya están filtrados),
-- pero igual quedan con RLS habilitado y política vía subquery para defensa en profundidad.
CREATE POLICY tenant_isolation_lead_eventos ON lead_eventos
  USING (
    lead_id IN (SELECT id FROM leads WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

CREATE POLICY tenant_isolation_ventas ON ventas
  USING (
    lead_id IN (SELECT id FROM leads WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

CREATE POLICY tenant_isolation_notificaciones ON notificaciones
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE tenant_id::text = current_setting('app.tenant_id', true))
  );

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
CREATE FUNCTION resolve_canal_publico(p_canal_id text)
RETURNS TABLE (id text, tenant_id text, tipo "TipoCanal", activo boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, tipo, activo FROM canales WHERE id = p_canal_id;
$$;

REVOKE ALL ON FUNCTION resolve_canal_publico(text) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION resolve_canal_publico(text) TO crm_app; -- ajustar al rol real de la app
