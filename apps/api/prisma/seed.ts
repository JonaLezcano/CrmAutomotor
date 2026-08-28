// Alta de usuarios es CEO-only (sección 6) — sin este seed no hay forma de
// loguearse la primera vez. Corre con: npx prisma db seed
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Concesionaria Demo',
      marcas: ['Demo Motors'],
      plan: 'demo',
    },
  });

  const passwordHash = await bcrypt.hash('admin1234', 12);
  const ceo = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Admin Demo',
      dni: '00000000',
      telefono: '+5490000000000',
      sector: 'Dirección',
      usuario: 'admin',
      passwordHash,
      rol: 'ceo',
    },
  });

  const canal = await prisma.canal.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      tipo: 'web',
      config: {},
      activo: true,
    },
  });

  console.log('Seed listo:');
  console.log(`  tenant: ${tenant.id} (${tenant.nombre})`);
  console.log(`  login CEO: usuario=admin password=admin1234`);
  console.log(`  canal web de prueba: ${canal.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
