import { EstadoLead, Temperatura } from '@crm/shared';
import { LeadsService } from './leads.service';

function crearService(leadExistente: any = null) {
  const prisma = {
    lead: {
      findUnique: jest.fn().mockResolvedValue(leadExistente),
      create: jest.fn().mockImplementation(({ data }) => ({ id: 'lead-nuevo', ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ ...leadExistente, ...data })),
    },
    leadEvento: { create: jest.fn().mockResolvedValue({}) },
  };
  const scoringService = { calcular: jest.fn().mockResolvedValue({ score: 10, temperatura: Temperatura.frio }) };
  const gateway = { emitLeadNuevo: jest.fn() };

  const service = new LeadsService(prisma as any, scoringService as any, gateway as any);
  return { service, prisma, scoringService, gateway };
}

// Sección 4/5: mismo teléfono+tenant = mismo lead, se fusiona el historial
// en vez de crear uno nuevo.
describe('LeadsService.ingest — dedup por teléfono+tenant', () => {
  it('crea un lead nuevo cuando no existe uno con ese teléfono en el tenant', async () => {
    const { service, prisma } = crearService(null);

    await service.ingest('tenant-1', 'canal-1', { telefono: '+5491111', nombre: 'Ana', mensaje: 'hola' });

    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-1', telefono: '+5491111', estado: EstadoLead.en_bolsa }),
      }),
    );
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('actualiza el lead existente (no crea uno nuevo) si el teléfono ya está en el tenant', async () => {
    const existente = { id: 'lead-1', nombre: 'Ana', vendedorAsignadoId: null, estado: EstadoLead.vendido };
    const { service, prisma } = crearService(existente);

    await service.ingest('tenant-1', 'canal-1', { telefono: '+5491111', mensaje: 'hola de nuevo' });

    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lead-1' } }),
    );
  });

  it('un lead ya cerrado (vendido/perdido) reabre en la bolsa al volver a escribir', async () => {
    const existente = { id: 'lead-1', nombre: 'Ana', vendedorAsignadoId: 'vend-1', estado: EstadoLead.perdido };
    const { service, prisma } = crearService(existente);

    await service.ingest('tenant-1', 'canal-1', { telefono: '+5491111', mensaje: 'hola de nuevo' });

    const llamada = prisma.lead.update.mock.calls[0][0];
    expect(llamada.data.estado).toBe(EstadoLead.en_bolsa);
    expect(llamada.data.vendedorAsignadoId).toBeNull();
  });

  it('no pisa el nombre existente si el nuevo mensaje no trae nombre', async () => {
    const existente = { id: 'lead-1', nombre: 'Ana', vendedorAsignadoId: null, estado: EstadoLead.en_bolsa };
    const { service, prisma } = crearService(existente);

    await service.ingest('tenant-1', 'canal-1', { telefono: '+5491111', mensaje: 'sin nombre esta vez' });

    expect(prisma.lead.update.mock.calls[0][0].data.nombre).toBe('Ana');
  });

  it('avisa por WebSocket del lead resultante (sección 7)', async () => {
    const { service, gateway } = crearService(null);
    await service.ingest('tenant-1', 'canal-1', { telefono: '+5491111', mensaje: 'hola' });
    expect(gateway.emitLeadNuevo).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ id: 'lead-nuevo' }));
  });
});
