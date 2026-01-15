import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Header() {
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between px-6 shadow-lg">

      {/* Logo + nombre sistema */}
      <div className="flex items-center gap-3 cursor-pointer">
        <img
          src="/logo.png"
          alt="Logo Inmobiliaria"
          className="h-10 w-auto rounded-md bg-white p-1"
        />

        <div className="leading-tight">
          <h1 className="font-bold text-xl">Sistema de Administración Inmobiliaria</h1>
        </div>
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.fullName || "Usuario"}</p>
            <p className="text-xs text-indigo-200 capitalize">{user?.role?.toLowerCase() || "Agente"}</p>
          </div>

          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-semibold ring-2 ring-white/30">
            {user ? getInitials(user.fullName) : "U"}
          </div>
        </div>

        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-100 hover:text-white transition-colors border-l border-indigo-500/50 pl-6"
          title="Cerrar Sesión"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar tus credenciales para acceder al sistema."
        confirmText="Cerrar Sesión"
        type="info"
      />
    </header>
  );
}
