import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Cargando...</div>;
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (user?.mustChangePassword && location.pathname !== '/cambiar-contrasena') {
        return <Navigate to="/cambiar-contrasena" replace />;
    }

    if (!user?.mustChangePassword && location.pathname === '/cambiar-contrasena') {
        return <Navigate to="/home" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
