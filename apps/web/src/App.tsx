import { Navigate, Route, Routes } from 'react-router-dom';
import { Rol } from '@crm/shared';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/Login';
import { Bolsa } from './pages/vendedor/Bolsa';
import { MisLeads } from './pages/vendedor/MisLeads';
import { Dashboard as DashboardSupervisor } from './pages/supervisor/Dashboard';
import { Usuarios } from './pages/ceo/Usuarios';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute rolMinimo={Rol.VENDEDOR} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Bolsa />} />
          <Route path="/mis-leads" element={<MisLeads />} />

          <Route element={<ProtectedRoute rolMinimo={Rol.SUPERVISOR} />}>
            <Route path="/equipo" element={<DashboardSupervisor />} />
          </Route>

          <Route element={<ProtectedRoute rolMinimo={Rol.CEO} />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
