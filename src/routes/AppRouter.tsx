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
import Liquidaciones from "../pages/Liquidaciones";
import LiquidacionDetalle from "../pages/LiquidacionDetalle";
import HistorialPagos from "../pages/HistorialPagos";
import Configuracion from "../pages/Configuracion";
import CajaChica from "../pages/CajaChica";
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import Sueldos from "../pages/Sueldos";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/propiedades" element={<Propiedades />} />
          <Route path="/personas" element={<Personas />} />
          <Route path="/contratos/papelera" element={<Papelera />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/liquidaciones" element={<Liquidaciones />} />
          <Route path="/liquidaciones/:id" element={<LiquidacionDetalle />} />
          <Route path="/pagos" element={<HistorialPagos />} />
          <Route path="/cajachica" element={<CajaChica />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/sueldos" element={<Sueldos />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
