import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppDeTest } from './utils/app';
import { crearTenantDeTest, limpiarBase, prismaTest, TenantDeTest } from './utils/db';

/**
 * Prueba formal de lo que se verificó a mano con curl al endurecer RLS
 * (sección 8): con dos tenants reales y HTTP real, ninguno debe ver un solo
 * dato del otro — ni por los endpoints normales, ni adivinando ids ajenos.
 */
describe('Aislamiento multi-tenant (RLS como barrera real)', () => {
  let app: INestApplication;
  let tenant1: TenantDeTest;
  let tenant2: TenantDeTest;
  let leadTenant1Id: string;

  beforeAll(async () => {
    await limpiarBase();
    app = await crearAppDeTest();
    tenant1 = await crearTenantDeTest('aisla1');
    tenant2 = await crearTenantDeTest('aisla2');

    const ingest = await request(app.getHttpServer())
      .post(`/api/canales/webhook/${tenant1.canalWebId}`)
      .send({ telefono: '+5491100000010', mensaje: 'lead de tenant 1' });
    leadTenant1Id = ingest.body.id;
  });

  afterAll(async () => {
    await app.close();
    await prismaTest.$disconnect();
  });

  async function loginCeo(tenant: TenantDeTest) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usuario: tenant.ceo.usuario, password: tenant.ceo.password });
    return res.body.accessToken as string;
  }

  it('tenant2 no ve los canales de tenant1', async () => {
    const [token1, token2] = await Promise.all([loginCeo(tenant1), loginCeo(tenant2)]);

    const canalesTenant1 = await request(app.getHttpServer())
      .get('/api/canales')
      .set('Authorization', `Bearer ${token1}`);
    expect(canalesTenant1.body.length).toBeGreaterThan(0);

    // tenant2 tiene su propio canal (crearTenantDeTest le crea uno a cada
    // tenant) — lo que hay que probar es que nunca ve el de tenant1, no que
    // su lista esté vacía.
    const canalesTenant2 = await request(app.getHttpServer())
      .get('/api/canales')
      .set('Authorization', `Bearer ${token2}`);
    const idsTenant2 = canalesTenant2.body.map((c: { id: string }) => c.id);
    expect(idsTenant2).toEqual([tenant2.canalWebId]);
    expect(idsTenant2).not.toContain(tenant1.canalWebId);
  });

  it('tenant2 no ve la bolsa de leads de tenant1', async () => {
    const token2 = await loginCeo(tenant2);
    const bolsa = await request(app.getHttpServer()).get('/api/leads/bolsa').set('Authorization', `Bearer ${token2}`);
    expect(bolsa.body.find((l: { id: string }) => l.id === leadTenant1Id)).toBeUndefined();
  });

  it('tenant2 solo ve sus propios usuarios, nunca los de tenant1', async () => {
    const token2 = await loginCeo(tenant2);
    const usuarios = await request(app.getHttpServer()).get('/api/usuarios').set('Authorization', `Bearer ${token2}`);

    const ids = usuarios.body.map((u: { id: string }) => u.id);
    expect(ids).toEqual(expect.arrayContaining([tenant2.ceo.id, tenant2.supervisor.id, tenant2.vendedor.id]));
    expect(ids).not.toContain(tenant1.ceo.id);
    expect(ids).not.toContain(tenant1.vendedor.id);
  });

  it('un vendedor de tenant2 no puede tomar un lead de tenant1 adivinando el id', async () => {
    const loginVendedor2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usuario: tenant2.vendedor.usuario, password: tenant2.vendedor.password });

    const tomar = await request(app.getHttpServer())
      .post(`/api/bolsa/${leadTenant1Id}/tomar`)
      .set('Authorization', `Bearer ${loginVendedor2.body.accessToken}`);

    // El where de bolsa.service.ts#tomar ya incluye tenantId del JWT: el
    // updateMany no afecta ninguna fila (lead existe, pero es de otro tenant).
    expect(tomar.status).toBe(409);

    const leadSinTocar = await prismaTest.lead.findUniqueOrThrow({ where: { id: leadTenant1Id } });
    expect(leadSinTocar.estado).toBe('en_bolsa');
    expect(leadSinTocar.vendedorAsignadoId).toBeNull();
  });

  it('GET /tenants/:id con el id de otro tenant no devuelve datos ajenos (RLS lo filtra a vacío)', async () => {
    const token2 = await loginCeo(tenant2);
    const res = await request(app.getHttpServer())
      .get(`/api/tenants/${tenant1.tenantId}`)
      .set('Authorization', `Bearer ${token2}`);

    // RLS bloquea la fila (findUnique devuelve null → Nest responde 200 con
    // body vacío, no 404) — lo que importa para el aislamiento es que no
    // venga NINGÚN dato del tenant ajeno, lo cual sí se cumple.
    expect(res.status).toBe(200);
    expect(res.text).toBe('');
  });
});
