-- CreateTable
CREATE TABLE "inversiones_canal" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tipo" "TipoCanal" NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inversiones_canal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inversiones_canal_tenant_id_idx" ON "inversiones_canal"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inversiones_canal_tenant_id_tipo_periodo_key" ON "inversiones_canal"("tenant_id", "tipo", "periodo");

-- AddForeignKey
ALTER TABLE "inversiones_canal" ADD CONSTRAINT "inversiones_canal_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
