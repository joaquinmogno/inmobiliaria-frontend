import { HomeIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md text-center"><p className="text-sm font-bold text-indigo-700">Error 404</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Esta página no existe</h1><p className="mt-3 text-gray-600">La dirección puede ser incorrecta o la página pudo haberse movido.</p><Link to="/home" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"><HomeIcon className="h-5 w-5" />Volver al inicio</Link></div>
  </main>;
}
