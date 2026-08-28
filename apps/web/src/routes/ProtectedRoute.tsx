import { Navigate, Outlet } from 'react-router-dom';
import { Rol } from '@crm/shared';
import { useAuthStore } from '../store/auth';

const JERARQUIA: Record<Rol, number> = { [Rol.VENDEDOR]: 0, [Rol.SUPERVISOR]: 1, [Rol.CEO]: 2 };

/** Espeja RolesGuard del backend (sección 6): cada rol ve lo del nivel de abajo. */
export function ProtectedRoute({ rolMinimo }: { rolMinimo: Rol }) {
  const usuario = useAuthStore((s) => s.usuario);

  if (!usuario) return <Navigate to="/login" replace />;
  if (JERARQUIA[usuario.rol] < JERARQUIA[rolMinimo]) return <Navigate to="/" replace />;

  return <Outlet />;
}
