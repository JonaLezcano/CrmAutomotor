import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface ResumenTenant {
  porEstado: { estado: string; _count: number }[];
  porTemperatura: { temperatura: string; _count: number }[];
  ventas: { cantidad: number; montoTotal: number };
}

interface RankingItem {
  vendedorId: string;
  nombre: string;
  cantidadVentas: number;
  montoTotal: number;
}

function StatTile({ eyebrow, valor, detalle }: { eyebrow: string; valor: string; detalle?: string }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        minWidth: 160,
        flex: 1,
      }}
    >
      <h3>{eyebrow}</h3>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, marginTop: 6 }}>{valor}</div>
      {detalle && <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>{detalle}</div>}
    </div>
  );
}

export function Dashboard() {
  const [resumen, setResumen] = useState<ResumenTenant | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  useEffect(() => {
    api.get<ResumenTenant>('/reportes/resumen').then(setResumen);
    api.get<RankingItem[]>('/reportes/ranking-vendedores').then(setRanking);
  }, []);

  const enBolsa = resumen?.porEstado.find((r) => r.estado === 'en_bolsa')?._count ?? 0;
  const asignados = resumen?.porEstado.find((r) => r.estado === 'asignado')?._count ?? 0;
  const caliente = resumen?.porTemperatura.find((r) => r.temperatura === 'caliente')?._count ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h2>Panel de equipo</h2>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <StatTile eyebrow="En bolsa" valor={String(enBolsa)} detalle="esperando que alguien los tome" />
        <StatTile eyebrow="Asignados" valor={String(asignados)} detalle="en gestión ahora mismo" />
        <StatTile eyebrow="Calientes" valor={String(caliente)} detalle="prioridad de contacto" />
        <StatTile
          eyebrow="Ventas"
          valor={String(resumen?.ventas.cantidad ?? 0)}
          detalle={`$${(resumen?.ventas.montoTotal ?? 0).toLocaleString()}`}
        />
      </div>

      <div>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Ranking de vendedores</h3>
        {ranking.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay ventas cargadas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Ventas</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.vendedorId}>
                  <td>{r.nombre}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.cantidadVentas}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>${r.montoTotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
