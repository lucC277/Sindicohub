import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../utils/permissions';

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, usuario } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.perfil)) {
    return <Navigate to={getDefaultRouteForRole(usuario.perfil)} replace />;
  }

  return children;
}
