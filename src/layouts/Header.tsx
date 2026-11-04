import { useState, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import AgencyLogo from "../components/AgencyLogo";

interface HeaderProps {
  toggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  inert?: boolean;
}

export default function Header({ toggleMobileMenu, mobileMenuOpen = false, menuButtonRef, inert = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sectionName = ({ home: "Inicio", contratos: "Contratos", liquidaciones: "Liquidaciones", cajachica: "Gestión financiera", pagos: "Cobros de inquilinos", "control-interno": "Control interno", teodoro: "Teodoro", daniel: "Daniel", personas: "Personas", usuarios: "Usuarios y roles", configuracion: "Configuración", "mi-acceso": "Mi acceso" } as Record<string, string>)[pathname.split("/")[1]] || "Administración";
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
    <>
    <header inert={inert || undefined} className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-slate-700 sm:px-6">

      {/* En escritorio, la marca permanece en el menú lateral. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {toggleMobileMenu && (
          <button ref={menuButtonRef} type="button" onClick={toggleMobileMenu} aria-label={mobileMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"} aria-expanded={mobileMenuOpen} aria-controls="main-sidebar" className="xl:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors">
            <Bars3Icon className="w-6 h-6 text-slate-600" />
          </button>
        )}
        <Link to="/home" title="Ir al inicio" className="flex min-w-0 items-center rounded-lg xl:hidden">
          <span className="sr-only">Ir al inicio: </span>
          <div className="flex h-9 w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white min-[360px]:h-11 min-[360px]:w-[132px] sm:w-[160px]">
            <AgencyLogo inmobiliaria={user?.inmobiliaria} />
          </div>
        </Link>
        <p className="hidden truncate text-sm font-medium text-slate-600 xl:block">{sectionName}</p>
      </div>

      {/* Usuario */}
      <div className="flex shrink-0 items-center">
        {canViewOperationalAlerts && <OperationalAlertBell />}
        {/* Dropdown del usuario */}
        <Menu as="div" className="relative">
          <MenuButton
            className="group flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100 sm:gap-3 sm:px-3 sm:py-2"
          >
            <span className="sr-only">Menú de usuario</span>
            <div className="hidden max-w-40 text-right xl:block">
              <p className="truncate text-sm font-medium" title={user?.fullName || "Usuario"}>{user?.fullName || "Usuario"}</p>
              <p className="hidden truncate text-xs text-slate-500 2xl:block">{user?.tipo === "ADMIN" ? "Administrador" : user?.rol?.nombre || "Usuario"}</p>
            </div>

            <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              {user ? getInitials(user.fullName) : "U"}
            </div>

            <ChevronDownIcon
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform duration-200 group-data-open:rotate-180"
            />
          </MenuButton>

          {/* Menú desplegable */}
          <MenuItems transition anchor="bottom end" className="ui-popover z-[200] mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-xl outline-none [--anchor-gap:4px]">
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
    </header>

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
    </>
  );
}
