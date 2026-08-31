import { FormEvent, useEffect, useState } from 'react';
import { TipoCanal } from '@crm/shared';
import { api, ApiError } from '../../lib/api';

interface CanalListado {
  id: string;
  tipo: TipoCanal;
  activo: boolean;
}

const TIPOS = [TipoCanal.web, TipoCanal.whatsapp, TipoCanal.instagram];

const LABEL_TIPO: Record<TipoCanal, string> = {
  [TipoCanal.web]: 'Formulario web',
  [TipoCanal.whatsapp]: 'WhatsApp',
  [TipoCanal.instagram]: 'Instagram',
};

export function Canales() {
  const [canales, setCanales] = useState<CanalListado[]>([]);
  const [tipo, setTipo] = useState<TipoCanal>(TipoCanal.web);
  const [error, setError] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  async function cargar() {
    setCanales(await api.get<CanalListado[]>('/canales'));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/canales', { tipo });
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el canal');
    }
  }

  async function toggleActivo(canal: CanalListado) {
    await api.patch(`/canales/${canal.id}/activo`, { activo: !canal.activo });
    await cargar();
  }

  function urlWebhook(canalId: string) {
    return `${window.location.origin}/api/canales/webhook/${canalId}`;
  }

  async function copiar(canalId: string) {
    try {
      await navigator.clipboard.writeText(urlWebhook(canalId));
      setCopiadoId(canalId);
      setTimeout(() => setCopiadoId(null), 1500);
    } catch {
      setError('No se pudo copiar — el navegador bloqueó el acceso al portapapeles. Copiá la URL a mano.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h2>Canales</h2>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'end',
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tipo de canal</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCanal)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {LABEL_TIPO[t]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Dar de alta</button>
      </form>
      {error && (
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
          {error}
        </div>
      )}

      {canales.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Todavía no hay canales configurados. Sin al menos uno no entra ningún lead a la bolsa.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {canales.map((canal) => (
            <div
              key={canal.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'var(--space-3)',
                background: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: canal.activo ? 'var(--color-frio)' : 'var(--color-text-faint)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, minWidth: 130 }}>{LABEL_TIPO[canal.tipo]}</span>
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  flex: 1,
                  minWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {urlWebhook(canal.id)}
              </code>
              <button className="secundario" onClick={() => copiar(canal.id)}>
                {copiadoId === canal.id ? 'Copiado' : 'Copiar webhook'}
              </button>
              <button className="secundario" onClick={() => toggleActivo(canal)}>
                {canal.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
