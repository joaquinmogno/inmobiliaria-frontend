export default function AccessDenied() {
  return (
    <div className="max-w-3xl mx-auto bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
      <p className="text-gray-500 mt-2">No tenés permisos para ver esta sección.</p>
    </div>
  );
}
