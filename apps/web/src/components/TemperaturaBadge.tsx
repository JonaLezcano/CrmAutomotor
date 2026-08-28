import { Temperatura } from '@crm/shared';

const COLOR: Record<Temperatura, string> = {
  [Temperatura.caliente]: '#e5484d',
  [Temperatura.tibio]: '#f5a623',
  [Temperatura.frio]: '#4a90d9',
};

const LABEL: Record<Temperatura, string> = {
  [Temperatura.caliente]: 'Caliente',
  [Temperatura.tibio]: 'Tibio',
  [Temperatura.frio]: 'Frío',
};

export function TemperaturaBadge({ temperatura }: { temperatura: Temperatura }) {
  return (
    <span
      style={{
        background: COLOR[temperatura],
        color: 'white',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {LABEL[temperatura]}
    </span>
  );
}
