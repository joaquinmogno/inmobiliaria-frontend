import { CheckCircleIcon, ShieldCheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../utils/permissions';

export default function MiAcceso() {
  const { user } = useAuth();
  const permissions = new Set(user?.permissions || []);
  const isAdmin = user?.tipo === 'ADMIN';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900">Mi acceso</h1><p className="mt-1 text-content-muted">Permisos actuales para {user?.fullName || 'tu usuario'}.</p></div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-right shadow-sm"><p className="text-xs font-black uppercase text-content-muted">Acceso</p><p className="font-bold text-gray-900">{isAdmin ? 'Administrador' : user?.rol?.nombre || 'Sin rol'}</p></div>
      </div>

      {isAdmin && <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-800"><ShieldCheckIcon className="h-7 w-7" /><div><p className="font-bold">Acceso total</p><p className="text-sm">Tu cuenta administradora puede acceder a todas las funciones, usuarios, backups y auditoría.</p></div></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        {PERMISSION_GROUPS.filter(group => isAdmin || !['Usuarios', 'Configuración'].includes(group.title)).map(group => (
          <section key={group.title} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <h2 className="border-b border-gray-100 bg-gray-50 px-5 py-4 text-sm font-black uppercase text-gray-600">{group.title}</h2>
            <div className="divide-y divide-gray-50">{group.permissions.map(permission => {
              const active = isAdmin || permissions.has(permission);
              return <div key={permission} className="flex items-center justify-between gap-4 px-5 py-3"><span className="text-sm font-semibold text-gray-800">{PERMISSION_LABELS[permission]}</span><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-content-muted'}`}>{active ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}{active ? 'Permitido' : 'No permitido'}</span></div>;
            })}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
