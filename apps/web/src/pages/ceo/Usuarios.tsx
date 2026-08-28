import { FormEvent, useEffect, useState } from 'react';
import { Rol } from '@crm/shared';
import { api, ApiError } from '../../lib/api';

interface UsuarioListado {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  estadoDisponibilidad: string;
}

const ROLES = [Rol.VENDEDOR, Rol.SUPERVISOR, Rol.CEO];
const FORM_INICIAL = { nombre: '', dni: '', telefono: '', sector: '', usuario: '', password: '', rol: Rol.VENDEDOR };

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setUsuarios(await api.get<UsuarioListado[]>('/usuarios'));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/usuarios', form);
      setForm(FORM_INICIAL);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h2>Usuarios</h2>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-3)',
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}
      >
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} required />
        <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
        <input placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} required />
        <input placeholder="Usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required />
        <input
          placeholder="Contraseña"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" style={{ alignSelf: 'end' }}>
          Crear usuario
        </button>
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

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Disponibilidad</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{u.usuario}</td>
              <td>{u.rol}</td>
              <td style={{ color: 'var(--color-text-muted)' }}>{u.estadoDisponibilidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
