-- Roles de Postgres para que RLS (rls.sql) sea una barrera real y no solo
-- decorativa. El usuario `crm` de docker-compose es el dueño de la base
-- (superusuario del contenedor), y Postgres NUNCA aplica RLS al dueño de una
-- tabla ni a un superusuario — así que hasta ahora todas las políticas de
-- rls.sql estaban activas pero eran, en la práctica, ignoradas siempre.
--
-- Se corre una sola vez, como `crm` (el dueño), después de rls.sql:
--   docker exec -i crm-postgres psql -U crm -d crm_automotor -f - < prisma/roles.sql
--
-- Dos roles con propósitos distintos, ninguno dueño de las tablas:
--   crm_app    → sin BYPASSRLS. Es el rol de runtime del backend para
--                requests HTTP normales (DATABASE_URL_APP). RLS lo alcanza.
--   crm_system → CON BYPASSRLS. Es el rol de runtime para los jobs de
--                sistema que necesitan ver todos los tenants a propósito
--                (DATABASE_URL_SYSTEM, ver bolsa.service.ts → @Cron).
-- `crm` (superusuario) se sigue usando solo para migraciones/seed vía CLI,
-- nunca para servir requests — ver DATABASE_URL vs DATABASE_URL_APP en .env.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crm_app') THEN
    CREATE ROLE crm_app LOGIN PASSWORD 'crm_app_dev_password';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crm_system') THEN
    CREATE ROLE crm_system LOGIN PASSWORD 'crm_system_dev_password' BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO crm_app, crm_system;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_app, crm_system;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_app, crm_system;
GRANT EXECUTE ON FUNCTION resolve_canal_publico(text) TO crm_app, crm_system;
GRANT EXECUTE ON FUNCTION resolve_usuario_login(text) TO crm_app, crm_system;

-- Para que las tablas que cree una migración futura (corrida como `crm`)
-- ya vengan con permisos, sin tener que repetir los GRANT de arriba a mano.
ALTER DEFAULT PRIVILEGES FOR ROLE crm IN SCHEMA public GRANT ALL ON TABLES TO crm_app, crm_system;
ALTER DEFAULT PRIVILEGES FOR ROLE crm IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_app, crm_system;
