import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRightOnRectangleIcon,
  UsersIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import ConfirmationModal from "../components/ConfirmationModal";
import UserProfileModal from "../components/UserProfileModal";

interface HeaderProps {
  toggleMobileMenu?: () => void;
}

export default function Header({ toggleMobileMenu }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between px-4 sm:px-6 shadow-lg z-30 relative">

      {/* Logo + nombre sistema con botón móvil */}
      <div className="flex items-center gap-3">
        {toggleMobileMenu && (
          <button onClick={toggleMobileMenu} className="sm:hidden p-1 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors">
            <Bars3Icon className="w-6 h-6 text-white" />
          </button>
        )}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/home")}>
          <div className="bg-white rounded-xl h-11 w-[160px] flex items-center justify-center shadow-md overflow-hidden">
            <img
              src="/logo.png"
              alt="PropControl Logo"
              className="h-full w-full object-contain scale-[2]"
            />
          </div>
          <div className="leading-tight hidden sm:block">
            <h1 className="font-bold text-lg text-white/95">{user?.inmobiliaria?.nombre || ""}</h1>
          </div>
        </div>
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-6">
        {/* Dropdown del usuario */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 hover:bg-indigo-700/50 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.fullName || "Usuario"}</p>
              <p className="text-xs text-indigo-200 capitalize">{user?.role?.toLowerCase() || "Agente"}</p>
            </div>

            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-semibold ring-2 ring-white/30">
              {user ? getInitials(user.fullName) : "U"}
            </div>

            <ChevronDownIcon
              className={`w-4 h-4 text-indigo-200 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Menú desplegable */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <UserCircleIcon className="w-5 h-5 text-indigo-500" />
                Mi Perfil
              </button>

              {user?.role === "ADMIN" && (
                <button
                  onClick={() => {
                    navigate("/usuarios");
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <UsersIcon className="w-5 h-5 text-indigo-500" />
                  Gestión de Usuarios
                </button>
              )}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
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

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />
    </header>
  );
}
