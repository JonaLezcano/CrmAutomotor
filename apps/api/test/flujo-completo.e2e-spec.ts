import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppDeTest } from './utils/app';
import { crearTenantDeTest, limpiarBase, prismaTest, TenantDeTest } from './utils/db';
import { BolsaService } from '../src/modules/bolsa/bolsa.service';

/**
 * Ejercita el flujo completo de la sección 5 del documento de arquitectura
 * contra HTTP real (supertest) + Postgres real (crm_automotor_test, con RLS
 * y roles de Postgres aplicados) — no mocks. Un solo tenant a lo largo de
 * todo el archivo; el aislamiento entre tenants se prueba aparte en
 * aislamiento-tenant.e2e-spec.ts.
 */
describe('Flujo completo: ingesta → dedup → scoring → bolsa → venta', () => {
  let app: INestApplication;
  let tenant: TenantDeTest;

  beforeAll(async () => {
    await limpiarBase();
    app = await crearAppDeTest();
    tenant = await crearTenantDeTest('flujo');
  });

  afterAll(async () => {
    await app.close();
    await prismaTest.$disconnect();
  });

  async function login(usuario: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ usuario, password });
    expect(res.status).toBe(200);
    return res.body as { accessToken: string; usuario: { id: string; rol: string; tenantId: string } };
  }

  describe('Ingesta multi-canal + dedup + scoring', () => {
    const telefono = '+5491100000001';
    let leadId: string;

    it('un mensaje con palabra de compra directa entra caliente con score 100 (sección 9.5)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono, nombre: 'Cliente Uno', mensaje: 'quiero comprar un auto ya' });

      expect(res.status).toBe(201);
      expect(res.body.temperatura).toBe('caliente');
      expect(res.body.score).toBe(100);
      expect(res.body.estado).toBe('en_bolsa');
      leadId = res.body.id;
    });

    it('el mismo teléfono no crea un lead nuevo — funde el historial en el existente (sección 4)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono, nombre: 'Cliente Uno (nombre actualizado)', mensaje: 'hola, sigo interesado' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(leadId); // mismo id: dedup por tenant+teléfono
      expect(res.body.nombre).toBe('Cliente Uno (nombre actualizado)');

      const enBolsaConEseTelefono = await prismaTest.lead.count({ where: { tenantId: tenant.tenantId, telefono } });
      expect(enBolsaConEseTelefono).toBe(1);
    });

    it('un lead vendido que vuelve a escribir reabre en la bolsa (sección 4)', async () => {
      await prismaTest.lead.update({ where: { id: leadId }, data: { estado: 'vendido' } });

      const res = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono, mensaje: 'hola de nuevo' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(leadId);
      expect(res.body.estado).toBe('en_bolsa');
    });
  });

  describe('Bolsa: toma libre con lock optimista', () => {
    it('el primer vendedor que la pide se la queda; el lead sale de la bolsa', async () => {
      const ingest = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono: '+5491100000002', mensaje: 'consulta general' });
      const leadId = ingest.body.id;

      const { accessToken } = await login(tenant.vendedor.usuario, tenant.vendedor.password);

      const tomar = await request(app.getHttpServer())
        .post(`/api/bolsa/${leadId}/tomar`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(tomar.status).toBe(201);
      expect(tomar.body.estado).toBe('asignado');
      expect(tomar.body.vendedorAsignadoId).toBe(tenant.vendedor.id);

      const bolsa = await request(app.getHttpServer())
        .get('/api/leads/bolsa')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(bolsa.body.find((l: { id: string }) => l.id === leadId)).toBeUndefined();
    });

    it('dos "tomar" simultáneos sobre el mismo lead: solo uno gana, el otro recibe 409', async () => {
      const ingest = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono: '+5491100000003', mensaje: 'otra consulta' });
      const leadId = ingest.body.id;

      const { accessToken } = await login(tenant.vendedor.usuario, tenant.vendedor.password);

      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).post(`/api/bolsa/${leadId}/tomar`).set('Authorization', `Bearer ${accessToken}`),
        request(app.getHttpServer()).post(`/api/bolsa/${leadId}/tomar`).set('Authorization', `Bearer ${accessToken}`),
      ]);

      const estados = [r1.status, r2.status].sort();
      expect(estados).toEqual([201, 409]);
    });
  });

  describe('Venta cierra el ciclo del lead', () => {
    it('registrar una venta pasa el lead a vendido y queda un lead_evento', async () => {
      const ingest = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono: '+5491100000004', mensaje: 'quiero comprar' });
      const leadId = ingest.body.id;

      const { accessToken } = await login(tenant.vendedor.usuario, tenant.vendedor.password);
      await request(app.getHttpServer()).post(`/api/bolsa/${leadId}/tomar`).set('Authorization', `Bearer ${accessToken}`);

      const venta = await request(app.getHttpServer())
        .post('/api/ventas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ leadId, auto: 'Corolla', modelo: 'XEI 2026', plan: 'contado', monto: 25000000 });

      expect(venta.status).toBe(201);

      const leadActualizado = await prismaTest.lead.findUniqueOrThrow({ where: { id: leadId } });
      expect(leadActualizado.estado).toBe('vendido');

      const evento = await prismaTest.leadEvento.findFirst({ where: { leadId, accion: 'venta_cargada' } });
      expect(evento).not.toBeNull();
    });

    it('rechaza con 403 una venta sobre un lead de otro tenant', async () => {
      const otroTenant = await crearTenantDeTest('ventaajena');
      const leadAjeno = await prismaTest.lead.create({
        data: {
          tenantId: otroTenant.tenantId,
          telefono: '+5491100000099',
          canalOrigenId: otroTenant.canalWebId,
          estado: 'en_bolsa',
        },
      });

      const { accessToken } = await login(tenant.vendedor.usuario, tenant.vendedor.password);
      const venta = await request(app.getHttpServer())
        .post('/api/ventas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ leadId: leadAjeno.id, auto: 'Auto', modelo: 'X', plan: 'contado', monto: 1 });

      expect(venta.status).toBe(403);
    });
  });

  describe('Asignación manual + notificación', () => {
    it('supervisor asigna manualmente y el vendedor recibe la notificación', async () => {
      const ingest = await request(app.getHttpServer())
        .post(`/api/canales/webhook/${tenant.canalWebId}`)
        .send({ telefono: '+5491100000005', mensaje: 'consulta' });
      const leadId = ingest.body.id;

      const supervisorLogin = await login(tenant.supervisor.usuario, tenant.supervisor.password);
      const asignar = await request(app.getHttpServer())
        .post(`/api/bolsa/${leadId}/asignar`)
        .set('Authorization', `Bearer ${supervisorLogin.accessToken}`)
        .send({ vendedorId: tenant.vendedor.id });

      expect(asignar.status).toBe(201);
      expect(asignar.body.vendedorAsignadoId).toBe(tenant.vendedor.id);

      const vendedorLogin = await login(tenant.vendedor.usuario, tenant.vendedor.password);
      const notifs = await request(app.getHttpServer())
        .get('/api/notificaciones')
        .set('Authorization', `Bearer ${vendedorLogin.accessToken}`);

      const notif = notifs.body.find(
        (n: { tipo: string; payload: { leadId: string } }) => n.tipo === 'lead_asignado' && n.payload.leadId === leadId,
      );
      expect(notif).toBeDefined();

      const marcar = await request(app.getHttpServer())
        .patch(`/api/notificaciones/${notif.id}/leido`)
        .set('Authorization', `Bearer ${vendedorLogin.accessToken}`);
      expect(marcar.status).toBe(200);
      expect(marcar.body.leido).toBe(true);
    });
  });

  describe('Auto-asignación por @Cron (regresión: RLS real bajo un job sin request HTTP)', () => {
    // bolsa.service.ts:autoAsignarVencidos() corre sin ningún tenant context
    // (no hay request HTTP de por medio) — la única forma real de probarlo
    // es invocar el método directamente, no esperar el timer de verdad.
    it('asigna el lead vencido y crea la notificación sin romper por RLS', async () => {
      const leadVencido = await prismaTest.lead.create({
        data: {
          tenantId: tenant.tenantId,
          telefono: '+5491100000006',
          canalOrigenId: tenant.canalWebId,
          estado: 'en_bolsa',
          timerVenceEn: new Date(Date.now() - 60_000),
        },
      });

      await expect(app.get(BolsaService).autoAsignarVencidos()).resolves.not.toThrow();

      const actualizado = await prismaTest.lead.findUniqueOrThrow({ where: { id: leadVencido.id } });
      expect(actualizado.estado).toBe('asignado');
      expect(actualizado.vendedorAsignadoId).toBe(tenant.vendedor.id);

      // Filtra por el leadId exacto: el vendedor ya puede tener otra
      // notificación de "lead_asignado" de un test anterior en este archivo.
      const notif = await prismaTest.notificacion.findFirst({
        where: {
          usuarioId: tenant.vendedor.id,
          tipo: 'lead_asignado',
          payload: { path: ['leadId'], equals: leadVencido.id },
        },
      });
      expect(notif).not.toBeNull();
    });
  });
});
