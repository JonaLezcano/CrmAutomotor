import { useEffect, useRef, useState } from 'react';
import { SocketEvent } from '@crm/shared';
import { api } from '../lib/api';
import { conectarSocket } from '../lib/socket';
import { useAuthStore } from '../store/auth';
import { activarPush, desactivarPush, soportaPush, suscripcionActual } from '../lib/push';

interface Notificacion {
  id: string;
  tipo: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const MENSAJE_TIPO: Record<string, string> = {
  lead_asignado: 'Te asignaron un lead nuevo',
};

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [pushActivo, setPushActivo] = useState(false);
  const [cambiandoPush, setCambiandoPush] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  async function cargar() {
    setNotificaciones(await api.get<Notificacion[]>('/notificaciones'));
  }

  useEffect(() => {
    if (!soportaPush()) return;
    suscripcionActual().then((sub) => setPushActivo(sub !== null));
  }, []);

  async function toggleAvisosPush() {
    setCambiandoPush(true);
    try {
      if (pushActivo) {
        await desactivarPush();
        setPushActivo(false);
      } else {
        const resultado = await activarPush();
        setPushActivo(resultado === 'activado');
        if (resultado === 'rechazado') {
          alert('Bloqueaste los avisos en el navegador — para activarlos hay que habilitarlos desde la configuración del sitio.');
        }
      }
    } finally {
      setCambiandoPush(false);
    }
  }

  useEffect(() => {
    cargar();
    if (!accessToken) return;
    const socket = conectarSocket(accessToken);
    // Cuando a este usuario le asignan un lead (manual o automático, sección
    // 7), refresca la lista en vez de esperar a que abra el dropdown.
    socket.on(SocketEvent.LEAD_ASIGNADO, cargar);
    return () => {
      socket.off(SocketEvent.LEAD_ASIGNADO, cargar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  async function marcarLeido(id: string) {
    await api.patch(`/notificaciones/${id}/leido`);
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div ref={contenedorRef} style={{ position: 'relative' }}>
      <button
        className="secundario"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Notificaciones${notificaciones.length > 0 ? ` (${notificaciones.length} sin leer)` : ''}`}
        style={{ position: 'relative', padding: '9px 12px' }}
      >
        🔔
        {notificaciones.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--color-caliente)',
              color: 'white',
              borderRadius: 999,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {notificaciones.length}
          </span>
        )}
      </button>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 300,
            background: 'var(--color-bg-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 10,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {soportaPush() && (
            <button
              onClick={toggleAvisosPush}
              disabled={cambiandoPush}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                padding: 'var(--space-3)',
                fontSize: 12,
                fontWeight: 400,
                cursor: cambiandoPush ? 'default' : 'pointer',
                opacity: cambiandoPush ? 0.6 : 1,
              }}
            >
              {pushActivo ? '✓ Avisos push activados (tocá para desactivar)' : 'Activar avisos push del navegador'}
            </button>
          )}

          {notificaciones.length === 0 ? (
            <p style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No tenés notificaciones nuevas.
            </p>
          ) : (
            notificaciones.map((n) => (
              <button
                key={n.id}
                onClick={() => marcarLeido(n.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  padding: 'var(--space-3)',
                  fontWeight: 400,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13 }}>{MENSAJE_TIPO[n.tipo] ?? n.tipo}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                  {new Date(n.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
