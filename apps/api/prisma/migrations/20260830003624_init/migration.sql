-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('vendedor', 'supervisor', 'ceo');

-- CreateEnum
CREATE TYPE "EstadoDisponibilidad" AS ENUM ('disponible', 'en_salon', 'en_llamada', 'offline');

-- CreateEnum
CREATE TYPE "TipoCanal" AS ENUM ('instagram', 'whatsapp', 'web');

-- CreateEnum
CREATE TYPE "Temperatura" AS ENUM ('caliente', 'tibio', 'frio');

-- CreateEnum
CREATE TYPE "EstadoLead" AS ENUM ('en_bolsa', 'asignado', 'contactado', 'vendido', 'perdido');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marcas" TEXT[],
    "plan" TEXT NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado_disponibilidad" "EstadoDisponibilidad" NOT NULL DEFAULT 'offline',
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tipo" "TipoCanal" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "canales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "nombre" TEXT,
    "canal_origen_id" TEXT NOT NULL,
    "fecha_primer_contacto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL DEFAULT 0,
    "temperatura" "Temperatura" NOT NULL DEFAULT 'frio',
    "estado" "EstadoLead" NOT NULL DEFAULT 'en_bolsa',
    "vendedor_asignado_id" TEXT,
    "fecha_asignacion" TIMESTAMP(3),
    "timer_vence_en" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_eventos" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_reglas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "condicion" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,

    CONSTRAINT "scoring_reglas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "auto" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "cuota" DECIMAL(12,2),
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios"("tenant_id");

-- CreateIndex
CREATE INDEX "canales_tenant_id_idx" ON "canales"("tenant_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_estado_idx" ON "leads"("tenant_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "leads_tenant_id_telefono_key" ON "leads"("tenant_id", "telefono");

-- CreateIndex
CREATE INDEX "lead_eventos_lead_id_idx" ON "lead_eventos"("lead_id");

-- CreateIndex
CREATE INDEX "scoring_reglas_tenant_id_idx" ON "scoring_reglas"("tenant_id");

-- CreateIndex
CREATE INDEX "ventas_lead_id_idx" ON "ventas"("lead_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leido_idx" ON "notificaciones"("usuario_id", "leido");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canales" ADD CONSTRAINT "canales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_canal_origen_id_fkey" FOREIGN KEY ("canal_origen_id") REFERENCES "canales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_asignado_id_fkey" FOREIGN KEY ("vendedor_asignado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_eventos" ADD CONSTRAINT "lead_eventos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_eventos" ADD CONSTRAINT "lead_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_reglas" ADD CONSTRAINT "scoring_reglas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
