interface Punto {
  fecha: string; // YYYY-MM-DD
  cantidad: number;
  monto: number;
}

/** Barras verticales de ventas por día (últimos N días) — altura proporcional al monto. */
export function GraficoTendencia({ puntos }: { puntos: Punto[] }) {
  const max = Math.max(1, ...puntos.map((p) => p.monto));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
      {puntos.map((p) => {
        const dia = new Date(`${p.fecha}T00:00:00`).getDate();
        return (
          <div
            key={p.fecha}
            title={`${p.fecha}: ${p.cantidad} venta${p.cantidad === 1 ? '' : 's'}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div
                style={{
                  width: '100%',
                  height: p.monto > 0 ? `${Math.max((p.monto / max) * 100, 4)}%` : 2,
                  background: p.cantidad > 0 ? 'var(--color-accent)' : 'var(--color-bg-raised-2)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)' }}>{dia}</span>
          </div>
        );
      })}
    </div>
  );
}
