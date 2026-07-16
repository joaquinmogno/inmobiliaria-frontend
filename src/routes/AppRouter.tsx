import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "../layouts/MainLayout";
import Login from "../pages/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionGuard from "../components/PermissionGuard";
import RoleGuard from "../components/RoleGuard";
import RecuperarContrasena from "../pages/RecuperarContrasena";

const Home = lazy(() => import("../pages/Home"));
const Contratos = lazy(() => import("../pages/Contratos"));
const Papelera = lazy(() => import("../pages/Papelera"));
const Usuarios = lazy(() => import("../pages/Usuarios"));
const Personas = lazy(() => import("../pages/Personas"));
const Propiedades = lazy(() => import("../pages/Propiedades"));
const Liquidaciones = lazy(() => import("../pages/Liquidaciones"));
const LiquidacionDetalle = lazy(() => import("../pages/LiquidacionDetalle"));
const HistorialPagos = lazy(() => import("../pages/HistorialPagos"));
const Configuracion = lazy(() => import("../pages/Configuracion"));
const CajaChica = lazy(() => import("../pages/CajaChica"));
const SuperAdminDashboard = lazy(() => import("../pages/SuperAdminDashboard"));
const Sueldos = lazy(() => import("../pages/Sueldos"));
const MiAcceso = lazy(() => import("../pages/MiAcceso"));
const NotFound = lazy(() => import("../pages/NotFound"));

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-500">Cargando...</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

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
          <Route path="/configuracion" element={<PermissionGuard permissions={["configuracion.perfil.ver", "configuracion.perfil.editar", "configuracion.backups.ver", "configuracion.backups.crear", "configuracion.backups.eliminar", "configuracion.backups.descargar", "configuracion.auditoria.ver"]}><Configuracion /></PermissionGuard>} />
          <Route path="/sueldos" element={<PermissionGuard permission="sueldos.ver"><Sueldos /></PermissionGuard>} />
          <Route path="/superadmin" element={<RoleGuard role="SUPERADMIN"><SuperAdminDashboard /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
