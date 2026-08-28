import { useEffect, useState } from 'react';
import { Lead, SocketEvent } from '@crm/shared';
import { api, ApiError } from '../../lib/api';
import { conectarSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/auth';
import { LeadCard } from '../../components/LeadCard';

export function Bolsa() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  async function cargar() {
    setLeads(await api.get<Lead[]>('/leads/bolsa'));
  }

  useEffect(() => {
    cargar();
    if (!accessToken) return;
    const socket = conectarSocket(accessToken);
    // Bolsa nueva/liberada (sección 7): cualquiera de los dos eventos cambia
    // lo que hay en la bolsa, así que ambos disparan un refetch simple.
    socket.on(SocketEvent.LEAD_NUEVO, cargar);
    socket.on(SocketEvent.LEAD_LIBERADO, cargar);
    socket.on(SocketEvent.LEAD_ASIGNADO, cargar);
    return () => {
      socket.off(SocketEvent.LEAD_NUEVO, cargar);
      socket.off(SocketEvent.LEAD_LIBERADO, cargar);
      socket.off(SocketEvent.LEAD_ASIGNADO, cargar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function tomar(leadId: string) {
    setMensaje(null);
    try {
      await api.post(`/bolsa/${leadId}/tomar`);
      await cargar();
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : 'No se pudo tomar el lead');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h2>Bolsa de datos</h2>
      {mensaje && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: 13,
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {mensaje}
        </div>
      )}
      {leads.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          No hay leads esperando. En cuanto entre uno nuevo por Instagram, WhatsApp o la web, aparece acá al instante.
        </p>
      )}
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} accion={<button onClick={() => tomar(lead.id)}>Tomar</button>} />
      ))}
    </div>
  );
}
