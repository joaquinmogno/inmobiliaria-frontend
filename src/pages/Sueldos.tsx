import { useState, useEffect } from "react";
import { sueldosService, type PagoSueldo } from "../services/sueldos.service";
import { usersService } from "../services/users.service";
import { useAuth } from "../context/AuthContext";
import { 
  BanknotesIcon, 
  PlusIcon
} from "@heroicons/react/24/outline";
import { type User } from "../services/auth.service";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR");
}

export default function Sueldos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  
  const [sueldos, setSueldos] = useState<PagoSueldo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    usuarioId: "",
    monto: "",
    fecha: new Date().toISOString().split('T')[0],
    periodo: `${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`,
    metodoPago: "EFECTIVO",
    observaciones: ""
  });

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sueldosRes, usersRes] = await Promise.all([
        sueldosService.getAll(),
        isAdmin ? usersService.getAll() : Promise.resolve([])
      ]);
      setSueldos(sueldosRes || []); // Fix: sueldosRes is an array directly
      if (isAdmin) setUsers(usersRes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sueldosService.create({
        ...formData,
        usuarioId: Number(formData.usuarioId),
        monto: Number(formData.monto)
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Error al registrar sueldo");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center text-indigo-900">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? "Gestión de Sueldos" : "Mis Recibos de Sueldo"}
          </h1>
          <p className="text-gray-500 text-sm">
            {isAdmin 
              ? "Registra y consulta los pagos realizados al equipo." 
              : "Consulta tu historial de pagos recibidos."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <PlusIcon className="w-5 h-5" />
            Registrar Pago
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Periodo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Método</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Registrado por</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-10 text-center">
                    <div className="flex justify-center flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Cargando...</p>
                    </div>
                  </td>
                </tr>
              ) : sueldos.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-10 text-center text-gray-500">
                    No hay pagos registrados.
                  </td>
                </tr>
              ) : (
                sueldos.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {s.usuario.nombreCompleto.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.usuario.nombreCompleto}</p>
                          <p className="text-xs text-gray-500">{s.usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {s.periodo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {formatCurrency(Number(s.monto))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(s.fecha)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {s.metodoPago}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {s.creadoPor.nombreCompleto}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <BanknotesIcon className="w-7 h-7 text-indigo-600" />
              Registrar Pago
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Empleado</label>
                <select 
                  required
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.usuarioId}
                  onChange={e => setFormData({...formData, usuarioId: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{(u as any).nombreCompleto || u.fullName}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Monto</label>
                  <input 
                    type="number" required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.monto}
                    onChange={e => setFormData({...formData, monto: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Periodo (MM-YYYY)</label>
                  <input 
                    type="text" placeholder="04-2026" required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.periodo}
                    onChange={e => setFormData({...formData, periodo: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Fecha de Pago</label>
                <input 
                  type="date" required
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.fecha}
                  onChange={e => setFormData({...formData, fecha: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Método</label>
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.metodoPago}
                  onChange={e => setFormData({...formData, metodoPago: e.target.value})}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
