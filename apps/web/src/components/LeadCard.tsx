import { Lead, Temperatura } from '@crm/shared';
import { TemperaturaBadge } from './TemperaturaBadge';

const BORDE: Record<Temperatura, string> = {
  [Temperatura.caliente]: 'var(--color-caliente)',
  [Temperatura.tibio]: 'var(--color-tibio)',
  [Temperatura.frio]: 'var(--color-frio)',
};

export function LeadCard({ lead, accion }: { lead: Lead; accion?: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${BORDE[lead.temperatura]}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontWeight: 600 }}>{lead.nombre ?? 'Sin nombre'}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)' }}>
          {lead.telefono}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <TemperaturaBadge temperatura={lead.temperatura} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-faint)' }}>
            score {String(lead.score).padStart(3, '0')}
          </span>
        </div>
      </div>
      {accion}
    </div>
  );
}
