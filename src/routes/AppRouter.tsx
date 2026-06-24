import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Contratos from "../pages/Contratos";
import Papelera from "../pages/Papelera";
import Usuarios from "../pages/Usuarios";
import Personas from "../pages/Personas";
import Propiedades from "../pages/Propiedades";
import Login from "../pages/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionGuard from "../components/PermissionGuard";
import Liquidaciones from "../pages/Liquidaciones";
import LiquidacionDetalle from "../pages/LiquidacionDetalle";
import HistorialPagos from "../pages/HistorialPagos";
import Configuracion from "../pages/Configuracion";
import CajaChica from "../pages/CajaChica";
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import Sueldos from "../pages/Sueldos";
import MiAcceso from "../pages/MiAcceso";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/mi-acceso" element={<MiAcceso />} />
          <Route path="/contratos" element={<PermissionGuard permission="contratos.ver"><Contratos /></PermissionGuard>} />
          <Route path="/propiedades" element={<PermissionGuard permission="propiedades.ver"><Propiedades /></PermissionGuard>} />
          <Route path="/personas" element={<PermissionGuard permission="personas.ver"><Personas /></PermissionGuard>} />
          <Route path="/contratos/papelera" element={<PermissionGuard permission="contratos.eliminar"><Papelera /></PermissionGuard>} />
          <Route path="/usuarios" element={<PermissionGuard permission="usuarios.ver"><Usuarios /></PermissionGuard>} />
          <Route path="/liquidaciones" element={<PermissionGuard permission="liquidaciones.ver"><Liquidaciones /></PermissionGuard>} />
          <Route path="/liquidaciones/:id" element={<PermissionGuard permission="liquidaciones.ver"><LiquidacionDetalle /></PermissionGuard>} />
          <Route path="/pagos" element={<PermissionGuard permission="pagos.ver"><HistorialPagos /></PermissionGuard>} />
          <Route path="/cajachica" element={<PermissionGuard permission="caja_chica.ver"><CajaChica /></PermissionGuard>} />
          <Route path="/configuracion" element={<PermissionGuard permission="configuracion.perfil.ver"><Configuracion /></PermissionGuard>} />
          <Route path="/sueldos" element={<PermissionGuard permission="sueldos.ver"><Sueldos /></PermissionGuard>} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
