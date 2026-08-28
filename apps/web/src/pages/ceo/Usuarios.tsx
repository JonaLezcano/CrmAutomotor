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

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [form, setForm] = useState({ nombre: '', dni: '', telefono: '', sector: '', usuario: '', password: '', rol: Rol.VENDEDOR });
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
      setForm({ nombre: '', dni: '', telefono: '', sector: '', usuario: '', password: '', rol: Rol.VENDEDOR });
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2>Usuarios</h2>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <button type="submit">Crear</button>
      </form>
      {error && <div style={{ color: '#e5484d' }}>{error}</div>}

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
              <td>{u.usuario}</td>
              <td>{u.rol}</td>
              <td>{u.estadoDisponibilidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
