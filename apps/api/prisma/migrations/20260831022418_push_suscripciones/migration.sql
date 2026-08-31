-- CreateTable
CREATE TABLE "push_suscripciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_suscripciones_endpoint_key" ON "push_suscripciones"("endpoint");

-- CreateIndex
CREATE INDEX "push_suscripciones_usuario_id_idx" ON "push_suscripciones"("usuario_id");

-- AddForeignKey
ALTER TABLE "push_suscripciones" ADD CONSTRAINT "push_suscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
