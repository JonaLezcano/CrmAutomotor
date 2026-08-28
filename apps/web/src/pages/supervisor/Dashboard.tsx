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

export function Dashboard() {
  const [resumen, setResumen] = useState<ResumenTenant | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  useEffect(() => {
    api.get<ResumenTenant>('/reportes/resumen').then(setResumen);
    api.get<RankingItem[]>('/reportes/ranking-vendedores').then(setRanking);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2>Panel de equipo</h2>

      {resumen && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h3>Leads por estado</h3>
            <ul>
              {resumen.porEstado.map((r) => (
                <li key={r.estado}>
                  {r.estado}: {r._count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Leads por temperatura</h3>
            <ul>
              {resumen.porTemperatura.map((r) => (
                <li key={r.temperatura}>
                  {r.temperatura}: {r._count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Ventas</h3>
            <p>
              {resumen.ventas.cantidad} ventas — ${resumen.ventas.montoTotal.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div>
        <h3>Ranking de vendedores</h3>
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
                <td>{r.cantidadVentas}</td>
                <td>${r.montoTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
