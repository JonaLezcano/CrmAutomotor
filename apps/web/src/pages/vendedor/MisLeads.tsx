import { useEffect, useState } from 'react';
import { EstadoLead, Lead } from '@crm/shared';
import { api } from '../../lib/api';
import { LeadCard } from '../../components/LeadCard';

export function MisLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  async function cargar() {
    setLeads(await api.get<Lead[]>('/leads/mis'));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function marcar(leadId: string, estado: EstadoLead) {
    await api.patch(`/leads/${leadId}/resultado`, { estado });
    await cargar();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h2>Mis leads</h2>
      {leads.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          No tenés leads en curso. Tomá uno de la bolsa para arrancar.
        </p>
      )}
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          accion={
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={() => marcar(lead.id, EstadoLead.contactado)}>Contactado</button>
              <button className="secundario" onClick={() => marcar(lead.id, EstadoLead.perdido)}>
                Perdido
              </button>
            </div>
          }
        />
      ))}
    </div>
  );
}
