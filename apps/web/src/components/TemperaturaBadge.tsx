import { Temperatura } from '@crm/shared';
import { Gauge } from './Gauge';

const LABEL: Record<Temperatura, string> = {
  [Temperatura.caliente]: 'Caliente',
  [Temperatura.tibio]: 'Tibio',
  [Temperatura.frio]: 'Frío',
};

const COLOR: Record<Temperatura, string> = {
  [Temperatura.caliente]: 'var(--color-caliente)',
  [Temperatura.tibio]: 'var(--color-tibio)',
  [Temperatura.frio]: 'var(--color-frio)',
};

export function TemperaturaBadge({ temperatura }: { temperatura: Temperatura }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 600,
        color: COLOR[temperatura],
      }}
    >
      <Gauge temperatura={temperatura} size={18} />
      {LABEL[temperatura]}
    </span>
  );
}
