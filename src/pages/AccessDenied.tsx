import { ArrowLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function AccessDenied({ permission }: { permission?: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
      <p className="mt-2 text-gray-600">Contactá a un administrador para solicitar acceso.</p>
      {permission && <p className="mt-3 text-sm text-gray-600">Permiso requerido: <code className="rounded bg-gray-100 px-2 py-1">{permission}</code></p>}
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-4 font-semibold text-gray-700"><ArrowLeftIcon className="h-5 w-5" />Volver</button><button onClick={() => navigate('/home')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 font-semibold text-white"><HomeIcon className="h-5 w-5" />Ir al inicio</button></div>
    </div>
  );
}
