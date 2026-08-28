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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>Mis leads</h2>
      {leads.length === 0 && <p style={{ opacity: 0.6 }}>No tenés leads asignados.</p>}
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          accion={
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => marcar(lead.id, EstadoLead.contactado)}>Contactado</button>
              <button onClick={() => marcar(lead.id, EstadoLead.perdido)}>Perdido</button>
            </div>
          }
        />
      ))}
    </div>
  );
}
