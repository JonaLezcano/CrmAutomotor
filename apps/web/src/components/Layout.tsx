import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { EstadoDisponibilidad, Rol } from '@crm/shared';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const activo = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 500,
        color: activo ? 'var(--color-text)' : 'var(--color-text-muted)',
        textDecoration: 'none',
        padding: '6px 2px',
        borderBottom: activo ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
    >
      {children}
    </Link>
  );
}

export function Layout() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function toggleDisponibilidad(estado: EstadoDisponibilidad) {
    await api.patch('/usuarios/disponibilidad', { estadoDisponibilidad: estado });
  }

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          padding: '14px var(--space-6)',
          background: 'var(--color-bg-raised)',
          borderBottom: '1px solid var(--color-border)',
          alignItems: 'center',
        }}
      >
        <strong
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: 15,
          }}
        >
          CRM <span style={{ color: 'var(--color-accent)' }}>Automotor</span>
        </strong>

        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          <NavLink to="/">Bolsa</NavLink>
          <NavLink to="/mis-leads">Mis leads</NavLink>
          {usuario && [Rol.SUPERVISOR, Rol.CEO].includes(usuario.rol) && <NavLink to="/equipo">Equipo</NavLink>}
          {usuario?.rol === Rol.CEO && <NavLink to="/usuarios">Usuarios</NavLink>}
        </div>

        <span style={{ flex: 1 }} />

        {usuario?.rol === Rol.VENDEDOR && (
          <select
            defaultValue={EstadoDisponibilidad.disponible}
            onChange={(e) => toggleDisponibilidad(e.target.value as EstadoDisponibilidad)}
          >
            <option value={EstadoDisponibilidad.disponible}>● Disponible</option>
            <option value={EstadoDisponibilidad.en_salon}>En salón</option>
            <option value={EstadoDisponibilidad.en_llamada}>En llamada</option>
            <option value={EstadoDisponibilidad.offline}>Offline</option>
          </select>
        )}

        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{usuario?.nombre}</span>

        <button
          className="secundario"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Salir
        </button>
      </nav>
      <main style={{ padding: 'var(--space-6)', maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
