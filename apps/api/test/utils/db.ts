import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Cliente directo con el superusuario (bypassea RLS a propósito): los tests
// necesitan sembrar/leer datos de cualquier tenant sin pasar por HTTP.
export const prismaTest = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// Guardrail extra (setup-env.ts ya valida esto, pero una función destructiva
// como esta merece su propio chequeo aunque el import se mueva de archivo).
function asegurarBaseDeTest() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('crm_automotor_test')) {
    throw new Error('limpiarBase() solo puede correr contra crm_automotor_test');
  }
}

/** Vacía todas las tablas de la app entre archivos de test — orden respeta las FKs. */
export async function limpiarBase() {
  asegurarBaseDeTest();
  await prismaTest.pushSuscripcion.deleteMany();
  await prismaTest.notificacion.deleteMany();
  await prismaTest.leadEvento.deleteMany();
  await prismaTest.venta.deleteMany();
  await prismaTest.lead.deleteMany();
  await prismaTest.scoringRegla.deleteMany();
  await prismaTest.canal.deleteMany();
  await prismaTest.usuario.deleteMany();
  await prismaTest.tenant.deleteMany();
}

export interface TenantDeTest {
  tenantId: string;
  canalWebId: string;
  ceo: { id: string; usuario: string; password: string };
  supervisor: { id: string; usuario: string; password: string };
  vendedor: { id: string; usuario: string; password: string };
}

let contador = 0;

/** Crea un tenant con canal web + los 3 roles, listo para loguearse por HTTP. */
export async function crearTenantDeTest(prefijo: string): Promise<TenantDeTest> {
  contador += 1;
  const sufijo = `${prefijo}${contador}`;
  const passwordHash = await bcrypt.hash('password1234', 4); // costo bajo: solo test, no producción

  const tenant = await prismaTest.tenant.create({
    data: { nombre: `Tenant ${sufijo}`, marcas: ['Marca Test'], plan: 'demo' },
  });

  const canal = await prismaTest.canal.create({
    data: { tenantId: tenant.id, tipo: 'web', config: {}, activo: true },
  });

  const [ceo, supervisor, vendedor] = await Promise.all([
    prismaTest.usuario.create({
      data: {
        tenantId: tenant.id,
        nombre: 'CEO Test',
        dni: '1',
        telefono: '+5490000000001',
        sector: 'Dirección',
        usuario: `ceo_${sufijo}`,
        passwordHash,
        rol: 'ceo',
      },
    }),
    prismaTest.usuario.create({
      data: {
        tenantId: tenant.id,
        nombre: 'Supervisor Test',
        dni: '2',
        telefono: '+5490000000002',
        sector: 'Ventas',
        usuario: `supervisor_${sufijo}`,
        passwordHash,
        rol: 'supervisor',
      },
    }),
    prismaTest.usuario.create({
      data: {
        tenantId: tenant.id,
        nombre: 'Vendedor Test',
        dni: '3',
        telefono: '+5490000000003',
        sector: 'Ventas',
        usuario: `vendedor_${sufijo}`,
        passwordHash,
        rol: 'vendedor',
        estadoDisponibilidad: 'disponible',
      },
    }),
  ]);

  return {
    tenantId: tenant.id,
    canalWebId: canal.id,
    ceo: { id: ceo.id, usuario: ceo.usuario, password: 'password1234' },
    supervisor: { id: supervisor.id, usuario: supervisor.usuario, password: 'password1234' },
    vendedor: { id: vendedor.id, usuario: vendedor.usuario, password: 'password1234' },
  };
}
