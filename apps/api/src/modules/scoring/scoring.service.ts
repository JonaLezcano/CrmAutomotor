import { Injectable } from '@nestjs/common';
import { Temperatura } from '@crm/shared';
import { PrismaService } from '../../prisma/prisma.service';

// Palabras de intención directa de compra (sección 9.5): si aparecen, el lead
// es Caliente automático sin importar el resto del puntaje. Prioridad máxima.
const PALABRAS_COMPRA_DIRECTA = ['quiero comprar', 'quiero adquirir', 'necesito un auto ya', 'quiero llevarmelo'];

// Umbrales sobre el score acumulado de scoring_reglas (sección 9.5). Ajustables
// por tenant a futuro; por ahora son el default global.
const UMBRAL_CALIENTE = 80;
const UMBRAL_TIBIO = 40;

// TODO(pendiente de definir con Jona, sección 9.5): horas sin contacto que
// hacen decaer una categoría. Default provisorio, configurable por tenant en
// scoring_reglas (campo='decaimiento_horas').
export const DECAIMIENTO_HORAS_DEFAULT = 24;

@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}

  async calcular(tenantId: string, mensaje: string): Promise<{ score: number; temperatura: Temperatura }> {
    const mensajeNormalizado = mensaje.toLowerCase();

    const esCompraDirecta = PALABRAS_COMPRA_DIRECTA.some((frase) => mensajeNormalizado.includes(frase));
    if (esCompraDirecta) {
      return { score: 100, temperatura: Temperatura.caliente };
    }

    const reglas = await this.prisma.scoringRegla.findMany({ where: { tenantId } });
    const score = reglas.reduce((total, regla) => {
      return mensajeNormalizado.includes(regla.condicion.toLowerCase()) ? total + regla.peso : total;
    }, 0);

    const temperatura =
      score >= UMBRAL_CALIENTE ? Temperatura.caliente : score >= UMBRAL_TIBIO ? Temperatura.tibio : Temperatura.frio;

    return { score, temperatura };
  }

  /** Baja un nivel de temperatura por antigüedad sin contacto (sección 9.5, regla de decaimiento). */
  degradarTemperatura(actual: Temperatura): Temperatura {
    if (actual === Temperatura.caliente) return Temperatura.tibio;
    if (actual === Temperatura.tibio) return Temperatura.frio;
    return Temperatura.frio;
  }
}
