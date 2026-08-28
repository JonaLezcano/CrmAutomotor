import { Link, Outlet, useNavigate } from 'react-router-dom';
import { EstadoDisponibilidad, Rol } from '@crm/shared';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

export function Layout() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function toggleDisponibilidad(estado: EstadoDisponibilidad) {
    await api.patch('/usuarios/disponibilidad', { estadoDisponibilidad: estado });
  }

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #333', alignItems: 'center' }}>
        <strong>CRM Automotor</strong>
        <Link to="/">Bolsa</Link>
        <Link to="/mis-leads">Mis leads</Link>
        {usuario && [Rol.SUPERVISOR, Rol.CEO].includes(usuario.rol) && <Link to="/equipo">Equipo</Link>}
        {usuario?.rol === Rol.CEO && <Link to="/usuarios">Usuarios</Link>}
        <span style={{ flex: 1 }} />
        {usuario?.rol === Rol.VENDEDOR && (
          <select defaultValue={EstadoDisponibilidad.disponible} onChange={(e) => toggleDisponibilidad(e.target.value as EstadoDisponibilidad)}>
            <option value={EstadoDisponibilidad.disponible}>Disponible</option>
            <option value={EstadoDisponibilidad.en_salon}>En salón</option>
            <option value={EstadoDisponibilidad.en_llamada}>En llamada</option>
            <option value={EstadoDisponibilidad.offline}>Offline</option>
          </select>
        )}
        <span>{usuario?.nombre}</span>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Salir
        </button>
      </nav>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
