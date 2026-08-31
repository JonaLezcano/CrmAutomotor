import { FormEvent, useEffect, useState } from 'react';
import { TipoCanal } from '@crm/shared';
import { api, ApiError } from '../lib/api';
import { formatearMonto } from '../lib/formato';

interface FilaInversion {
  tipo: string;
  inversion: number;
  leads: number;
  cantidadVentas: number;
  montoVentas: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
}

const LABEL_CANAL: Record<string, string> = {
  [TipoCanal.web]: 'Formulario web',
  [TipoCanal.whatsapp]: 'WhatsApp',
  [TipoCanal.instagram]: 'Instagram',
};

const TODOS_LOS_TIPOS = [TipoCanal.web, TipoCanal.whatsapp, TipoCanal.instagram];

function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
}

function celdaMoneda(valor: number | null): string {
  return valor === null ? '—' : `$${formatearMonto(Math.round(valor))}`;
}

/**
 * Inversión publicitaria por canal (CEO-only): carga manual del gasto del
 * mes y cruce contra leads/ventas del mismo canal.tipo para CPL/CPA/ROAS.
 * No hay integración real con Meta/Google Ads — sin esa data, CTR y CPM no
 * se pueden calcular (necesitan impresiones/clics, que este CRM nunca ve).
 */
export function InversionCanales() {
  const [periodo, setPeriodo] = useState(mesActual());
  const [filas, setFilas] = useState<Record<string, FilaInversion>>({});
  const [montosEditados, setMontosEditados] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const datos = await api.get<FilaInversion[]>(`/reportes/inversion-canales?periodo=${periodo}`);
    setFilas(Object.fromEntries(datos.map((f) => [f.tipo, f])));
  }

  useEffect(() => {
    cargar();
    setMontosEditados({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function guardarInversion(e: FormEvent, tipo: TipoCanal) {
    e.preventDefault();
    const monto = Number(montosEditados[tipo]);
    if (!Number.isFinite(monto) || monto < 0) return;

    setError(null);
    setGuardando(tipo);
    try {
      await api.post('/reportes/inversion-canales', { tipo, periodo, monto });
      await cargar();
      setMontosEditados((prev) => ({ ...prev, [tipo]: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la inversión');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h3>Inversión por canal</h3>
        <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: 13,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Canal</th>
              <th>Inversión</th>
              <th>Leads</th>
              <th>CPL</th>
              <th>Ventas</th>
              <th>CPA</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {TODOS_LOS_TIPOS.map((tipo) => {
              const fila = filas[tipo];
              return (
                <tr key={tipo}>
                  <td>{LABEL_CANAL[tipo]}</td>
                  <td>
                    <form
                      onSubmit={(e) => guardarInversion(e, tipo)}
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={fila ? String(fila.inversion) : '0'}
                        value={montosEditados[tipo] ?? ''}
                        onChange={(e) => setMontosEditados((prev) => ({ ...prev, [tipo]: e.target.value }))}
                        style={{ width: 110, padding: '6px 8px' }}
                      />
                      <button
                        type="submit"
                        className="secundario"
                        disabled={guardando === tipo || !montosEditados[tipo]}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      >
                        {guardando === tipo ? '…' : 'Guardar'}
                      </button>
                    </form>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{fila?.leads ?? 0}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{celdaMoneda(fila?.cpl ?? null)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{fila?.cantidadVentas ?? 0}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{celdaMoneda(fila?.cpa ?? null)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: fila?.roas && fila.roas >= 1 ? 'var(--color-frio)' : undefined }}>
                    {fila?.roas === null || fila?.roas === undefined ? '—' : `${fila.roas.toFixed(1)}x`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 'var(--space-3)' }}>
        CPL: costo por lead. CPA: costo por venta. ROAS: pesos vendidos por cada peso invertido. La inversión se carga a
        mano por ahora — sin conexión directa con Meta/Google Ads todavía no hay CTR ni CPM reales.
      </p>
    </div>
  );
}
