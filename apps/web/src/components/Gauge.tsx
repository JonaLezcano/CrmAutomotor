import { Temperatura } from '@crm/shared';

// Elemento de firma de todo el producto: la temperatura de un lead (sección
// 9.5) se lee literalmente como una aguja de tablero — frío a la izquierda
// (aire acondicionado), tibio al centro, caliente a la derecha (línea roja).
// Se usa chico en cada TemperaturaBadge y grande como pieza decorativa del
// login, para que el mismo lenguaje visual recorra toda la interfaz.

const ROTACION: Record<Temperatura, number> = {
  [Temperatura.frio]: -60,
  [Temperatura.tibio]: 0,
  [Temperatura.caliente]: 60,
};

const COLOR: Record<Temperatura, string> = {
  [Temperatura.frio]: 'var(--color-frio)',
  [Temperatura.tibio]: 'var(--color-tibio)',
  [Temperatura.caliente]: 'var(--color-caliente)',
};

export function Gauge({ temperatura, size = 20 }: { temperatura: Temperatura; size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 100 65"
      role="img"
      aria-label={`Temperatura: ${temperatura}`}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      <path d="M 10 50 A 40 40 0 0 1 30 15.36" fill="none" stroke="var(--color-frio)" strokeWidth="7" strokeLinecap="round" opacity={0.35} />
      <path d="M 30 15.36 A 40 40 0 0 1 70 15.36" fill="none" stroke="var(--color-tibio)" strokeWidth="7" strokeLinecap="round" opacity={0.35} />
      <path d="M 70 15.36 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-caliente)" strokeWidth="7" strokeLinecap="round" opacity={0.35} />
      <g transform={`rotate(${ROTACION[temperatura]} 50 50)`} style={{ transition: 'transform 0.25s ease' }}>
        <line x1="50" y1="50" x2="50" y2="16" stroke={COLOR[temperatura]} strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="6" fill={COLOR[temperatura]} />
    </svg>
  );
}
