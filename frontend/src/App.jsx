import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastStack } from './components/ui/ToastStack';
import { useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { EncomendasPage } from './pages/EncomendasPage';
import { LoginPage } from './pages/LoginPage';
import { MuralPage } from './pages/MuralPage';
import { OcorrenciasPage } from './pages/OcorrenciasPage';
import { PlantaoPage } from './pages/PlantaoPage';
import { RegimentoPage } from './pages/RegimentoPage';
import { ReservasPage } from './pages/ReservasPage';
import { TaxasPage } from './pages/TaxasPage';
import { getDefaultRouteForRole, ROUTE_ACCESS } from './utils/permissions';

function RootRedirect() {
  const { isAuthenticated, usuario } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDefaultRouteForRole(usuario?.perfil)} replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route
            path="/painel"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/painel']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/encomendas"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/encomendas']}>
                <EncomendasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservas"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/reservas']}>
                <ReservasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ocorrencias"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/ocorrencias']}>
                <OcorrenciasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mural"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/mural']}>
                <MuralPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regimento"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/regimento']}>
                <RegimentoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/taxas"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/taxas']}>
                <TaxasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plantao"
            element={
              <ProtectedRoute allowedRoles={ROUTE_ACCESS['/plantao']}>
                <PlantaoPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>

      <ToastStack />
    </>
  );
}
