import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginResponse, Temperatura } from '@crm/shared';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Gauge } from '../components/Gauge';

export function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const setSesion = useAuthStore((s) => s.setSesion);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { usuario, password });
      setSesion(data);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-6)',
        padding: 'var(--space-5)',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <Gauge temperatura={Temperatura.tibio} size={220} />
      </div>

      <div style={{ textAlign: 'center', marginTop: -40 }}>
        <h1 style={{ fontSize: 34 }}>
          CRM <span style={{ color: 'var(--color-accent)' }}>Automotor</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', fontSize: 14 }}>
          Ingresá con el usuario de tu concesionaria.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          width: '100%',
          maxWidth: 320,
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Usuario</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

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

        <button type="submit" disabled={cargando} style={{ marginTop: 'var(--space-2)' }}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
