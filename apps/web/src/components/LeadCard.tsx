import { Lead } from '@crm/shared';
import { TemperaturaBadge } from './TemperaturaBadge';

export function LeadCard({ lead, accion }: { lead: Lead; accion?: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #333',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{lead.nombre ?? 'Sin nombre'}</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>{lead.telefono}</div>
        <div style={{ marginTop: 4 }}>
          <TemperaturaBadge temperatura={lead.temperatura} /> <span style={{ fontSize: 12, opacity: 0.6 }}>score {lead.score}</span>
        </div>
      </div>
      {accion}
    </div>
  );
}
