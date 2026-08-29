import { FormEvent, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface Props {
  leadId: string;
  onVentaCargada: () => void;
  onCancelar: () => void;
}

// Cierre del ciclo del lead (sección 5, paso 7): antes no había ninguna
// pantalla para esto, solo el endpoint POST /ventas.
export function VentaForm({ leadId, onVentaCargada, onCancelar }: Props) {
  const [form, setForm] = useState({ auto: '', modelo: '', plan: '', cuota: '', monto: '' });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post('/ventas', {
        leadId,
        auto: form.auto,
        modelo: form.modelo,
        plan: form.plan,
        cuota: form.cuota ? Number(form.cuota) : undefined,
        monto: Number(form.monto),
      });
      onVentaCargada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la venta');
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 'var(--space-2)',
        background: 'var(--color-bg-raised-2)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        marginTop: 'var(--space-2)',
      }}
    >
      <input placeholder="Auto (marca)" value={form.auto} onChange={(e) => setForm({ ...form, auto: e.target.value })} required autoFocus />
      <input placeholder="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} required />
      <input placeholder="Plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} required />
      <input
        placeholder="Cuota (opcional)"
        type="number"
        min="0"
        step="0.01"
        value={form.cuota}
        onChange={(e) => setForm({ ...form, cuota: e.target.value })}
      />
      <input
        placeholder="Monto total"
        type="number"
        min="0"
        step="0.01"
        value={form.monto}
        onChange={(e) => setForm({ ...form, monto: e.target.value })}
        required
      />

      {error && (
        <div
          role="alert"
          style={{
            gridColumn: '1 / -1',
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

      <div style={{ display: 'flex', gap: 'var(--space-2)', gridColumn: '1 / -1' }}>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Confirmar venta'}
        </button>
        <button type="button" className="secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
