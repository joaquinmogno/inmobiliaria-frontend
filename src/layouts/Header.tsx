import { useState, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRightOnRectangleIcon,
  UsersIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Bars3Icon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import ConfirmationModal from "../components/ConfirmationModal";
import UserProfileModal from "../components/UserProfileModal";
import OperationalAlertBell from "../components/OperationalAlertBell";
import { hasPermission } from "../utils/permissions";

interface HeaderProps {
  toggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  inert?: boolean;
}

export default function Header({ toggleMobileMenu, mobileMenuOpen = false, menuButtonRef, inert = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const canManageUsers = user?.tipo === "ADMIN";
  const canViewOperationalAlerts = hasPermission(user, "reportes.dashboard.ver");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header inert={inert || undefined} className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between px-4 sm:px-6 shadow-lg z-30 relative">

      {/* Logo + nombre sistema con botón móvil */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {toggleMobileMenu && (
          <button ref={menuButtonRef} type="button" onClick={toggleMobileMenu} aria-label={mobileMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"} aria-expanded={mobileMenuOpen} aria-controls="main-sidebar" className="xl:hidden p-1 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors">
            <Bars3Icon className="w-6 h-6 text-white" />
          </button>
        )}
        <Link to="/home" title="Ir al inicio" className="flex min-w-0 items-center gap-4 rounded-xl">
          <span className="sr-only">Ir al inicio: </span>
          <div className="flex h-11 w-[132px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md sm:w-[160px]">
            <img
              src="/logo-440.webp"
              width="440"
              height="240"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain scale-[2]"
            />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <h1 className="max-w-40 truncate font-bold text-lg text-white/95 lg:max-w-64" title={user?.inmobiliaria?.nombre || ""}>{user?.inmobiliaria?.nombre || ""}</h1>
          </div>
        </Link>
      </div>

      {/* Usuario */}
      <div className="flex shrink-0 items-center">
        {canViewOperationalAlerts && <OperationalAlertBell />}
        {/* Dropdown del usuario */}
        <Menu as="div" className="relative">
          <MenuButton
            className="group flex items-center gap-3 hover:bg-indigo-700/50 rounded-lg px-3 py-2 transition-colors"
          >
            <span className="sr-only">Menú de usuario</span>
            <div className="hidden max-w-40 text-right xl:block">
              <p className="truncate text-sm font-medium" title={user?.fullName || "Usuario"}>{user?.fullName || "Usuario"}</p>
              <p className="hidden truncate text-xs text-on-accent-muted 2xl:block">{user?.tipo === "ADMIN" ? "Administrador" : user?.rol?.nombre || "Usuario"}</p>
            </div>

            <div aria-hidden="true" className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-semibold ring-2 ring-white/30">
              {user ? getInitials(user.fullName) : "U"}
            </div>

            <ChevronDownIcon
              aria-hidden="true"
              className="w-4 h-4 text-on-accent-muted transition-transform duration-200 group-data-open:rotate-180"
            />
          </MenuButton>

          {/* Menú desplegable */}
          <MenuItems anchor="bottom end" className="z-[200] mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-xl outline-none [--anchor-gap:4px]">
            <MenuItem>
              <button type="button"
                onClick={() => {
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-700 transition-colors data-focus:bg-indigo-50 data-focus:text-indigo-700"
              >
                <UserCircleIcon className="w-5 h-5 text-indigo-500" />
                Mi Perfil
              </button>
            </MenuItem>
            <MenuItem>
              <button type="button"
                onClick={() => {
                  navigate("/mi-acceso");
                }}
                className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-700 transition-colors data-focus:bg-indigo-50 data-focus:text-indigo-700"
              >
                <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
                Mi acceso
              </button>
            </MenuItem>

              {canManageUsers && (
                <MenuItem><button type="button"
                  onClick={() => {
                    navigate("/usuarios");
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-700 transition-colors data-focus:bg-indigo-50 data-focus:text-indigo-700"
                >
                  <UsersIcon className="w-5 h-5 text-indigo-500" />
                  Usuarios y roles
                </button></MenuItem>
              )}
            <MenuItem>
              <button type="button"
                onClick={() => {
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-status-danger transition-colors data-focus:bg-red-50"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
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
