import { useEffect, useState } from 'react';
import { Lead, Rol, SocketEvent } from '@crm/shared';
import { api, ApiError } from '../../lib/api';
import { conectarSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/auth';
import { LeadCard } from '../../components/LeadCard';

interface UsuarioListado {
  id: string;
  nombre: string;
  rol: Rol;
}

export function Bolsa() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vendedores, setVendedores] = useState<UsuarioListado[]>([]);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const usuario = useAuthStore((s) => s.usuario);
  const esSupervisorOCeo = usuario?.rol === Rol.SUPERVISOR || usuario?.rol === Rol.CEO;

  async function cargar() {
    setLeads(await api.get<Lead[]>('/leads/bolsa'));
  }

  useEffect(() => {
    cargar();
    // La asignación manual (sección 6) es de supervisor/CEO para arriba —
    // el listado de vendedores solo hace falta para ese caso.
    if (esSupervisorOCeo) {
      api.get<UsuarioListado[]>('/usuarios').then((todos) => setVendedores(todos.filter((u) => u.rol === Rol.VENDEDOR)));
    }
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

  async function asignar(leadId: string) {
    const vendedorId = asignaciones[leadId];
    if (!vendedorId) return;
    setMensaje(null);
    try {
      await api.post(`/bolsa/${leadId}/asignar`, { vendedorId });
      await cargar();
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : 'No se pudo asignar el lead');
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
        <LeadCard
          key={lead.id}
          lead={lead}
          accion={
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              {esSupervisorOCeo && (
                <>
                  <select
                    value={asignaciones[lead.id] ?? ''}
                    onChange={(e) => setAsignaciones({ ...asignaciones, [lead.id]: e.target.value })}
                  >
                    <option value="">Asignar a…</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                  <button className="secundario" disabled={!asignaciones[lead.id]} onClick={() => asignar(lead.id)}>
                    Asignar
                  </button>
                </>
              )}
              <button onClick={() => tomar(lead.id)}>Tomar</button>
            </div>
          }
        />
      ))}
    </div>
  );
}
