import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  TrashIcon,
  CalculatorIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden ${isActive
      ? "bg-indigo-600 text-white font-semibold shadow-md"
      : "text-indigo-100 hover:bg-indigo-700/50 hover:text-white"
    }`;

  const disabledClass =
    "flex items-center gap-3 px-4 py-3 rounded-lg opacity-40 cursor-not-allowed text-indigo-300 whitespace-nowrap overflow-hidden";

  return (
    <aside
      className={`bg-indigo-800 text-white h-full p-4 shadow-xl flex-shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-20"
        }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <nav className="flex flex-col gap-2">
        <NavLink to="/home" className={linkClass}>
          <HomeIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Home
          </span>
        </NavLink>

        <NavLink to="/contratos" className={linkClass}>
          <DocumentTextIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Contratos
          </span>
        </NavLink>

        <NavLink to="/contratos/papelera" className={linkClass}>
          <TrashIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Papelera
          </span>
        </NavLink>

        {user?.role === "ADMIN" && (
          <NavLink to="/usuarios" className={linkClass}>
            <UsersIcon className="w-6 h-6 min-w-[24px]" />
            <span
              className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
                }`}
            >
              Usuarios
            </span>
          </NavLink>
        )}

        <hr className="my-4 border-indigo-600" />

        <div className={disabledClass}>
          <CalculatorIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Liquidaciones
          </span>
        </div>

        <div className={disabledClass}>
          <BanknotesIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Efectivo
          </span>
        </div>

        <div className={disabledClass}>
          <CreditCardIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Pagos / Egresos
          </span>
        </div>

        <div className={disabledClass}>
          <ArrowsRightLeftIcon className="w-6 h-6 min-w-[24px]" />
          <span
            className={`transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"
              }`}
          >
            Transferencias
          </span>
        </div>
      </nav>
    </aside>
  );
}
