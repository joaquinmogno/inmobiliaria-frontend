import {
  CheckCircleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type PermissionKey,
} from "../utils/permissions";

export default function MiAcceso() {
  const { user } = useAuth();
  const effectivePermissions = new Set(user?.permissions || []);
  const inheritedPermissions = new Set(user?.inheritedPermissions || []);
  const directPermissions = new Set(user?.directPermissions || []);
  const deniedPermissions = new Set(user?.deniedPermissions || []);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mi acceso</h1>
          <p className="text-gray-500 mt-1">Permisos actuales para {user?.fullName || "tu usuario"}.</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm text-right">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Rol</p>
          <p className="text-sm font-bold text-gray-900">{ROLE_LABELS[user?.role || ""] || user?.role || "-"}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold">
          <CheckCircleIcon className="w-5 h-5" />
          {effectivePermissions.size} permisos permitidos
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold">
          <ShieldCheckIcon className="w-5 h-5" />
          {inheritedPermissions.size} heredados por rol
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-bold">
          <XCircleIcon className="w-5 h-5" />
          {deniedPermissions.size} no permitidos
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PERMISSION_GROUPS.map(group => (
          <section key={group.title} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <h2 className="text-sm font-black uppercase tracking-wide text-gray-600">{group.title}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {group.permissions.map(permission => {
                const active = effectivePermissions.has(permission);
                const inherited = inheritedPermissions.has(permission);
                const direct = directPermissions.has(permission);

                return (
                  <div key={permission} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{PERMISSION_LABELS[permission as PermissionKey]}</p>
                      <p className="text-xs text-gray-400">{permission}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {inherited && <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold">Incluido por rol</span>}
                      {direct && <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold">Directo</span>}
                      <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {active ? "Permitido" : "No permitido"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
