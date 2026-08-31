import { useEffect, useState } from 'react';
import { Rol, TipoCanal } from '@crm/shared';
import { api } from '../../lib/api';
import { formatearMonto } from '../../lib/formato';
import { useAuthStore } from '../../store/auth';
import { BarraHorizontal } from '../../components/BarraHorizontal';
import { GraficoTendencia } from '../../components/GraficoTendencia';
import { InversionCanales } from '../../components/InversionCanales';

interface ResumenTenant {
  porEstado: { estado: string; _count: number }[];
  porTemperatura: { temperatura: string; _count: number }[];
  porCanal: { tipo: string; cantidad: number }[];
  disponibilidadEquipo: { estado: string; cantidad: number }[];
  // Llega como string (Prisma.Decimal serializado) — ver formatearMonto.
  ventas: { cantidad: number; montoTotal: number | string };
}

interface RankingItem {
  vendedorId: string;
  nombre: string;
  cantidadVentas: number;
  montoTotal: number | string;
}

interface PuntoTendencia {
  fecha: string;
  cantidad: number;
  monto: number;
}

const LABEL_CANAL: Record<string, string> = {
  [TipoCanal.web]: 'Formulario web',
  [TipoCanal.whatsapp]: 'WhatsApp',
  [TipoCanal.instagram]: 'Instagram',
};

const LABEL_DISPONIBILIDAD: Record<string, string> = {
  disponible: 'Disponible',
  en_salon: 'En salón',
  en_llamada: 'En llamada',
  offline: 'Offline',
};

const COLOR_DISPONIBILIDAD: Record<string, string> = {
  disponible: 'var(--color-frio)',
  en_salon: 'var(--color-tibio)',
  en_llamada: 'var(--color-accent)',
  offline: 'var(--color-text-faint)',
};

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

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        flex: 1,
        minWidth: 260,
      }}
    >
      <h3 style={{ marginBottom: 'var(--space-4)' }}>{titulo}</h3>
      {children}
    </div>
  );
}

export function Dashboard() {
  const usuario = useAuthStore((s) => s.usuario);
  const [resumen, setResumen] = useState<ResumenTenant | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [tendencia, setTendencia] = useState<PuntoTendencia[]>([]);

  useEffect(() => {
    api.get<ResumenTenant>('/reportes/resumen').then(setResumen);
    api.get<RankingItem[]>('/reportes/ranking-vendedores').then(setRanking);
    api.get<PuntoTendencia[]>('/reportes/tendencia-ventas').then(setTendencia);
  }, []);

  const enBolsa = resumen?.porEstado.find((r) => r.estado === 'en_bolsa')?._count ?? 0;
  const asignados = resumen?.porEstado.find((r) => r.estado === 'asignado')?._count ?? 0;
  const caliente = resumen?.porTemperatura.find((r) => r.temperatura === 'caliente')?._count ?? 0;
  const vendidos = resumen?.porEstado.find((r) => r.estado === 'vendido')?._count ?? 0;
  const perdidos = resumen?.porEstado.find((r) => r.estado === 'perdido')?._count ?? 0;
  const tasaConversion = vendidos + perdidos > 0 ? Math.round((vendidos / (vendidos + perdidos)) * 100) : null;

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
          detalle={`$${formatearMonto(resumen?.ventas.montoTotal ?? 0)}`}
        />
        <StatTile
          eyebrow="Conversión"
          valor={tasaConversion === null ? '—' : `${tasaConversion}%`}
          detalle={`${vendidos} vendidos, ${perdidos} perdidos`}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Panel titulo="Leads por canal">
          {resumen && resumen.porCanal.length > 0 ? (
            <BarraHorizontal
              items={resumen.porCanal.map((c) => ({ etiqueta: LABEL_CANAL[c.tipo] ?? c.tipo, valor: c.cantidad }))}
            />
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Todavía no entraron leads.</p>
          )}
        </Panel>

        <Panel titulo="Equipo ahora">
          {resumen && resumen.disponibilidadEquipo.length > 0 ? (
            <BarraHorizontal
              items={resumen.disponibilidadEquipo.map((d) => ({
                etiqueta: LABEL_DISPONIBILIDAD[d.estado] ?? d.estado,
                valor: d.cantidad,
                color: COLOR_DISPONIBILIDAD[d.estado],
              }))}
            />
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Todavía no hay vendedores cargados.</p>
          )}
        </Panel>
      </div>

      <Panel titulo="Ventas — últimos 14 días">
        {tendencia.length > 0 ? (
          <GraficoTendencia puntos={tendencia} />
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando…</p>
        )}
      </Panel>

      {usuario?.rol === Rol.CEO && <InversionCanales />}

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
                  <td style={{ fontFamily: 'var(--font-mono)' }}>${formatearMonto(r.montoTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
