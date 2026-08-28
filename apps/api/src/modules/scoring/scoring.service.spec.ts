import { Temperatura } from '@crm/shared';
import { ScoringService } from './scoring.service';

function crearService(reglas: { condicion: string; peso: number }[] = []) {
  const prisma = {
    scoringRegla: { findMany: jest.fn().mockResolvedValue(reglas) },
  };
  return { service: new ScoringService(prisma as any), prisma };
}

describe('ScoringService', () => {
  // Sección 9.5: la palabra clave de compra directa gana sin importar el
  // resto del puntaje, y ni siquiera consulta scoring_reglas.
  describe('calcular — regla de palabra clave (prioridad máxima)', () => {
    it('marca Caliente automático si el mensaje tiene una frase de compra directa', async () => {
      const { service, prisma } = crearService([{ condicion: 'cuota', peso: 999 }]);

      const resultado = await service.calcular('tenant-1', 'Hola, quiero comprar el modelo XLS');

      expect(resultado).toEqual({ score: 100, temperatura: Temperatura.caliente });
      expect(prisma.scoringRegla.findMany).not.toHaveBeenCalled();
    });

    it('es insensible a mayúsculas/minúsculas', async () => {
      const { service } = crearService();
      const resultado = await service.calcular('tenant-1', 'QUIERO ADQUIRIR el auto ya');
      expect(resultado.temperatura).toBe(Temperatura.caliente);
    });
  });

  describe('calcular — reglas secundarias por tenant', () => {
    it('suma el peso de cada regla configurada cuyo texto aparece en el mensaje', async () => {
      const { service } = crearService([
        { condicion: 'cuota', peso: 50 },
        { condicion: 'plan', peso: 20 },
        { condicion: 'no matchea esto', peso: 1000 },
      ]);

      const resultado = await service.calcular('tenant-1', 'Quería preguntar por el plan y la cuota mensual');

      expect(resultado.score).toBe(70);
      expect(resultado.temperatura).toBe(Temperatura.tibio); // 70 está entre 40 y 80
    });

    it('sin reglas que matcheen, score 0 y temperatura frío', async () => {
      const { service } = crearService([{ condicion: 'cuota', peso: 50 }]);
      const resultado = await service.calcular('tenant-1', 'Hola, buenas tardes');
      expect(resultado).toEqual({ score: 0, temperatura: Temperatura.frio });
    });

    it('score >= 80 es caliente aunque no haya palabra clave', async () => {
      const { service } = crearService([
        { condicion: 'cuota', peso: 50 },
        { condicion: 'plan', peso: 40 },
      ]);
      const resultado = await service.calcular('tenant-1', 'plan y cuota');
      expect(resultado.temperatura).toBe(Temperatura.caliente);
    });
  });

  describe('degradarTemperatura', () => {
    it('baja un nivel: caliente -> tibio -> frío, y frío se queda en frío', () => {
      const { service } = crearService();
      expect(service.degradarTemperatura(Temperatura.caliente)).toBe(Temperatura.tibio);
      expect(service.degradarTemperatura(Temperatura.tibio)).toBe(Temperatura.frio);
      expect(service.degradarTemperatura(Temperatura.frio)).toBe(Temperatura.frio);
    });
  });
});
