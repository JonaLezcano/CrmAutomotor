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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>Bolsa de datos</h2>
      {mensaje && <div style={{ color: '#e5484d' }}>{mensaje}</div>}
      {leads.length === 0 && <p style={{ opacity: 0.6 }}>No hay leads en la bolsa ahora mismo.</p>}
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} accion={<button onClick={() => tomar(lead.id)}>Tomar</button>} />
      ))}
    </div>
  );
}
