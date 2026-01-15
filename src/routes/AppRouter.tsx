import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Contratos from "../pages/Contratos";
import Papelera from "../pages/Papelera";
import Usuarios from "../pages/Usuarios";
import Login from "../pages/Login";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/contratos/papelera" element={<Papelera />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
