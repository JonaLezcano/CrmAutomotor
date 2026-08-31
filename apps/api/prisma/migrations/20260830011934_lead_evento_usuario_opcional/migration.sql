-- DropForeignKey
ALTER TABLE "lead_eventos" DROP CONSTRAINT "lead_eventos_usuario_id_fkey";

-- AlterTable
ALTER TABLE "lead_eventos" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "lead_eventos" ADD CONSTRAINT "lead_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
