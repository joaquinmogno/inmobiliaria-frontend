import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "../layouts/MainLayout";
import Login from "../pages/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionGuard from "../components/PermissionGuard";
import LoadingState from "../components/LoadingState";

const Home = lazy(() => import("../pages/Home"));
const Contratos = lazy(() => import("../pages/Contratos"));
const RescisionContrato = lazy(() => import("../pages/RescisionContrato"));
const Papelera = lazy(() => import("../pages/Papelera"));
const Usuarios = lazy(() => import("../pages/Usuarios"));
const Personas = lazy(() => import("../pages/Personas"));
const Liquidaciones = lazy(() => import("../pages/Liquidaciones"));
const LiquidacionDetalle = lazy(() => import("../pages/LiquidacionDetalle"));
const ContratoLiquidaciones = lazy(() => import("../pages/ContratoLiquidaciones"));
const HistorialPagos = lazy(() => import("../pages/HistorialPagos"));
const Configuracion = lazy(() => import("../pages/Configuracion"));
const CajaChica = lazy(() => import("../pages/CajaChica"));
const ControlMovimientos = lazy(() => import("../pages/ControlMovimientos"));
const MiAcceso = lazy(() => import("../pages/MiAcceso"));
const MandatoryPasswordChange = lazy(() => import("../pages/MandatoryPasswordChange"));
const NotFound = lazy(() => import("../pages/NotFound"));

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="p-6"><LoadingState label="Cargando página…" /></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/cambiar-contrasena" element={<MandatoryPasswordChange />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/mi-acceso" element={<MiAcceso />} />
          <Route path="/contratos" element={<PermissionGuard permission="contratos.ver"><Contratos /></PermissionGuard>} />
          <Route path="/contratos/:id/rescision" element={<PermissionGuard permission="contratos.ver"><PermissionGuard permission="liquidaciones.ver"><RescisionContrato /></PermissionGuard></PermissionGuard>} />
          <Route path="/propiedades" element={<Navigate to="/contratos" replace />} />
          <Route path="/personas" element={<PermissionGuard permission="personas.ver"><Personas /></PermissionGuard>} />
          <Route path="/contratos/papelera" element={<PermissionGuard permissions={["contratos.restaurar", "contratos.eliminar"]}><Papelera /></PermissionGuard>} />
          <Route path="/usuarios" element={<PermissionGuard adminOnly><Usuarios /></PermissionGuard>} />
          <Route path="/liquidaciones" element={<PermissionGuard permission="liquidaciones.ver"><Liquidaciones /></PermissionGuard>} />
          <Route path="/liquidaciones/contrato/:contratoId" element={<PermissionGuard permission="liquidaciones.ver"><ContratoLiquidaciones /></PermissionGuard>} />
          <Route path="/liquidaciones/:id" element={<PermissionGuard permission="liquidaciones.ver"><LiquidacionDetalle /></PermissionGuard>} />
          <Route path="/pagos" element={<PermissionGuard permission="pagos.ver"><HistorialPagos /></PermissionGuard>} />
          <Route path="/cajachica" element={<PermissionGuard permission="caja_chica.ver"><CajaChica /></PermissionGuard>} />
          <Route path="/control-interno" element={<PermissionGuard permission="control_interno.ver"><ControlMovimientos /></PermissionGuard>} />
          <Route path="/teodoro" element={<PermissionGuard permission="teodoro.ver"><ControlMovimientos ambito="TEODORO" /></PermissionGuard>} />
          <Route path="/daniel" element={<PermissionGuard permission="daniel.ver"><ControlMovimientos ambito="DANIEL" /></PermissionGuard>} />
          <Route path="/configuracion" element={<PermissionGuard adminOnly><Configuracion /></PermissionGuard>} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
