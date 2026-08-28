import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginResponse } from '@crm/shared';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../store/auth';

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
    <div style={{ maxWidth: 320, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1>CRM Automotor</h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={{ color: '#e5484d' }}>{error}</div>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
