import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  HomeModernIcon,
  TrashIcon,
  CalculatorIcon,
  BanknotesIcon,
  CreditCardIcon,
  UserGroupIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  PlusIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface SidebarProps {
  mobileOpen?: boolean;
  closeMobile?: () => void;
}

export default function Sidebar({ mobileOpen, closeMobile }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(() => localStorage.getItem("sidebar-expanded") !== "false");
  const [isContratosOpen, setIsContratosOpen] = useState(false);
  const menuExpanded = Boolean(mobileOpen || isExpanded);
  const toggleExpanded = () => setIsExpanded(current => {
    localStorage.setItem("sidebar-expanded", String(!current));
    return !current;
  });
  const canViewProperties = hasPermission(user, "propiedades.ver");
  const canViewPeople = hasPermission(user, "personas.ver");
  const canViewContracts = hasPermission(user, "contratos.ver");
  const canCreateContracts = hasPermission(user, "contratos.crear");
  const canDeleteContracts = hasPermission(user, "contratos.eliminar");
  const canViewLiquidations = hasPermission(user, "liquidaciones.ver");
  const canViewCash = hasPermission(user, "caja_chica.ver");
  const canViewPayments = hasPermission(user, "pagos.ver");
  const canViewSalaries = hasPermission(user, "sueldos.ver");
  const canViewConfiguration = ["configuracion.perfil.ver", "configuracion.perfil.editar", "configuracion.backups.ver", "configuracion.backups.crear", "configuracion.backups.eliminar", "configuracion.backups.descargar", "configuracion.auditoria.ver"]
    .some(permission => hasPermission(user, permission as Parameters<typeof hasPermission>[1]));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${isActive
      ? "bg-indigo-600 text-white font-semibold shadow-md"
      : "text-indigo-100 hover:bg-indigo-700/50 hover:text-white"
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 sm:hidden" 
          onClick={closeMobile} 
        />
      )}

      <aside
        className={`bg-indigo-800 text-white h-full p-4 shadow-xl flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-40 absolute sm:relative ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full sm:translate-x-0"
        } ${isExpanded && !mobileOpen ? "sm:w-64" : "sm:w-20"}`}
    >
      {/* Logo / Branding */}
        <div className={`flex items-center mb-6 transition-all duration-300 ${menuExpanded ? 'px-2' : 'justify-center px-0'}`}>
          {menuExpanded ? (
            <div className="bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden h-12 w-full">
               <img src="/logo-440.webp" alt="PropControl" width="440" height="240" className="h-full w-full object-contain scale-[2]" onError={(e)=>(e.target as HTMLImageElement).style.display='none'} />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden w-11 h-11 flex-shrink-0">
               <img src="/logo-icon.png" alt="PropControl Icon" className="h-full w-full object-contain p-1.5" onError={(e)=>(e.target as HTMLImageElement).style.display='none'} />
            </div>
          )}
        </div>

        <hr className="border-indigo-600/50 mb-2" />

        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden" aria-label="Navegación principal" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) closeMobile?.();
        }}>
        {/* Home */}
        <NavLink to="/home" className={linkClass}>
          <HomeIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Inicio
          </span>
        </NavLink>


        {/* Propiedades */}
        {canViewProperties && <NavLink to="/propiedades" className={linkClass}>
          <HomeModernIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Propiedades
          </span>
        </NavLink>}

        {/* Personas */}
        {canViewPeople && <NavLink to="/personas" className={linkClass}>
          <UserGroupIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Personas
          </span>
        </NavLink>}

        {/* Contratos (con submenú Papelera) */}
        {canViewContracts && <div>
          <div className="flex items-center">
          <NavLink to="/contratos" className={({isActive}) => `${linkClass({isActive})} flex-1`} title={!menuExpanded ? "Contratos" : undefined}>
            <DocumentTextIcon className="w-6 h-6 min-w-[24px]" />
            <span
              className={`flex-1 text-left transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
                }`}
            >
              Contratos
            </span>
          </NavLink>
            {menuExpanded && (canCreateContracts || canDeleteContracts) && (
              <button type="button" aria-label="Mostrar opciones de contratos" aria-expanded={isContratosOpen} onClick={() => setIsContratosOpen(prev => !prev)} className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-indigo-100 hover:bg-indigo-700/50">
              <ChevronDownIcon
                className={`w-4 h-4 min-w-[16px] transition-transform duration-200 ${isContratosOpen ? "rotate-180" : ""
                  }`}
              />
              </button>
            )}
          </div>

          {/* Submenú */}
          {menuExpanded && isContratosOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1">
              {canCreateContracts && <button
                onClick={() => {
                  navigate("/contratos", { state: { openNewContractModal: true } });
                  if (mobileOpen && closeMobile) closeMobile();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden text-indigo-100 hover:bg-indigo-700/50 hover:text-white"
              >
                <PlusIcon className="w-5 h-5 min-w-[20px]" />
                <span className="text-sm">Crear Contrato</span>
              </button>}
              {canDeleteContracts && <NavLink to="/contratos/papelera" className={linkClass}>
                <TrashIcon className="w-5 h-5 min-w-[20px]" />
                <span className="text-sm">Papelera</span>
              </NavLink>}
            </div>
          )}
        </div>}

        {/* Liquidaciones */}
        {canViewLiquidations && <NavLink to="/liquidaciones" className={linkClass}>
          <CalculatorIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Liquidaciones
          </span>
        </NavLink>}


        {canViewCash && <NavLink to="/cajachica" className={linkClass}>
          <BanknotesIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Caja Chica
          </span>
        </NavLink>}

        {canViewPayments && <NavLink to="/pagos" className={linkClass}>
          <CreditCardIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Pagos / Egresos
          </span>
        </NavLink>}

        {canViewSalaries && (
          <NavLink to="/sueldos" className={linkClass}>
            <BanknotesIcon className="w-6 h-6 min-w-[24px]" />
            <span
              className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
                }`}
            >
              Sueldos
            </span>
          </NavLink>
        )}

        <hr className="my-1 border-indigo-600/50" />

        {/* Configuración */}
        {canViewConfiguration && <NavLink to="/configuracion" className={linkClass}>
          <Cog6ToothIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Configuración
          </span>
        </NavLink>}

        {user?.role === 'SUPERADMIN' && (
          <>
            <NavLink to="/superadmin" className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${isActive
                  ? "bg-amber-500 text-white font-semibold shadow-md"
                  : "text-amber-200 hover:bg-amber-600/50 hover:text-white"
                }`
            }>
              <GlobeAltIcon className="w-6 h-6 min-w-[24px]" />
              <span
                className={`transition-opacity duration-300 ${menuExpanded ? "opacity-100" : "opacity-0 w-0"
                  }`}
              >
                Consola SaaS
              </span>
            </NavLink>
          </>
        )}
        </nav>

        <button type="button" onClick={toggleExpanded} className="mt-2 hidden min-h-11 items-center justify-center gap-2 rounded-lg text-indigo-100 hover:bg-indigo-700/50 sm:flex" aria-label={isExpanded ? "Contraer menú" : "Expandir menú"} title={isExpanded ? "Contraer menú" : "Expandir menú"}>
          {isExpanded ? <ChevronDoubleLeftIcon className="h-5 w-5" /> : <ChevronDoubleRightIcon className="h-5 w-5" />}
          {menuExpanded && <span className="text-sm font-medium">Contraer menú</span>}
        </button>

        {/* Footer de marca */}
        {menuExpanded && (
          <div className="mt-6 pt-5 border-t border-indigo-600/30">
            <div className="flex flex-col items-center justify-center">
              <span className="text-indigo-100/90 text-xs font-bold tracking-widest uppercase">PropControl</span>
              <span className="mt-1 text-xs font-medium text-indigo-200">© {new Date().getFullYear()} Todos los derechos reservados</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
