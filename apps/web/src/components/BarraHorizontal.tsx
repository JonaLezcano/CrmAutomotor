interface Item {
  etiqueta: string;
  valor: number;
  color?: string;
}

/** Lista de barras horizontales proporcionales al máximo del set — para breakdowns simples (por canal, por disponibilidad). */
export function BarraHorizontal({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map((i) => i.valor));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {items.map((item) => (
        <div key={item.etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 13, minWidth: 90, color: 'var(--color-text-muted)' }}>{item.etiqueta}</span>
          <div style={{ flex: 1, background: 'var(--color-bg-raised-2)', borderRadius: 'var(--radius-sm)', height: 8 }}>
            <div
              style={{
                width: `${(item.valor / max) * 100}%`,
                background: item.color ?? 'var(--color-accent)',
                height: '100%',
                borderRadius: 'var(--radius-sm)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, minWidth: 24, textAlign: 'right' }}>
            {item.valor}
          </span>
        </div>
      ))}
    </div>
  );
}
