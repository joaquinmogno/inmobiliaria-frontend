import { useState, useEffect } from "react";
import { sueldosService, type PagoSueldo } from "../services/sueldos.service";
import { usersService } from "../services/users.service";
import { useAuth } from "../context/AuthContext";
import { BanknotesIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { type User } from "../services/auth.service";
import { hasPermission } from "../utils/permissions";
import NumericInput from "../components/NumericInput";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR");
}

const initialFormData = () => ({
  usuarioId: "",
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
  periodo: `${String(new Date().getMonth() + 1).padStart(2, "0")}-${new Date().getFullYear()}`,
  metodoPago: "EFECTIVO",
  observaciones: "",
});

export default function Sueldos() {
  const { user } = useAuth();
  const canView = hasPermission(user, "sueldos.ver");
  const canCreate = hasPermission(user, "sueldos.crear");
  const canEdit = hasPermission(user, "sueldos.editar");
  const canDelete = hasPermission(user, "sueldos.eliminar");

  const [sueldos, setSueldos] = useState<PagoSueldo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSueldo, setEditingSueldo] = useState<PagoSueldo | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, [canView, canCreate, canEdit]);

  const fetchData = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sueldosRes, usersRes] = await Promise.all([
        sueldosService.getAll(),
        canCreate || canEdit ? usersService.getAll() : Promise.resolve([]),
      ]);
      setSueldos(sueldosRes || []);
      setUsers(usersRes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSueldo(null);
    setFormData(initialFormData());
    setShowModal(true);
  };

  const openEditModal = (sueldo: PagoSueldo) => {
    setEditingSueldo(sueldo);
    setFormData({
      usuarioId: String(sueldo.usuario.id || sueldo.usuarioId),
      monto: String(Math.round(Number(sueldo.monto))),
      fecha: sueldo.fecha.slice(0, 10),
      periodo: sueldo.periodo,
      metodoPago: sueldo.metodoPago,
      observaciones: sueldo.observaciones || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        usuarioId: Number(formData.usuarioId),
        monto: Number(formData.monto),
      };

      if (editingSueldo) {
        await sueldosService.update(editingSueldo.id, payload);
      } else {
        await sueldosService.create(payload);
      }

      setShowModal(false);
      setEditingSueldo(null);
      fetchData();
    } catch (error) {
      alert(editingSueldo ? "Error al editar sueldo" : "Error al registrar sueldo");
    }
  };

  const handleDelete = async (sueldo: PagoSueldo) => {
    if (!window.confirm(`¿Eliminar el pago de ${sueldo.usuario.nombreCompleto} del periodo ${sueldo.periodo}?`)) {
      return;
    }

    try {
      await sueldosService.delete(sueldo.id);
      fetchData();
    } catch (error) {
      alert("Error al eliminar sueldo");
    }
  };

  if (!canView) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-gray-500 mt-2">No tenés permisos para ver el módulo de sueldos.</p>
      </div>
    );
  }

  const hasRowActions = canEdit || canDelete;
  const columnCount = hasRowActions ? 7 : 6;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center text-indigo-900">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Sueldos</h1>
          <p className="text-gray-500 text-sm">Registra y consulta los pagos realizados al equipo.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Registrado por</th>
                {hasRowActions && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-6 py-10 text-center">
                    <div className="flex justify-center flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Cargando...</p>
                    </div>
                  </td>
                </tr>
              ) : sueldos.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-6 py-10 text-center text-gray-500">
                    No hay pagos registrados.
                  </td>
                </tr>
              ) : (
                sueldos.map((sueldo) => (
                  <tr key={sueldo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {sueldo.usuario.nombreCompleto.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{sueldo.usuario.nombreCompleto}</p>
                          <p className="text-xs text-gray-500">{sueldo.usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {sueldo.periodo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {formatCurrency(Number(sueldo.monto))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(sueldo.fecha)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {sueldo.metodoPago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{sueldo.creadoPor.nombreCompleto}</td>
                    {hasRowActions && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(sueldo)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar sueldo"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(sueldo)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar sueldo"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <BanknotesIcon className="w-7 h-7 text-indigo-600" />
              {editingSueldo ? "Editar Pago" : "Registrar Pago"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Empleado</label>
                <select
                  required
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.usuarioId}
                  onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {users.map((teamUser) => (
                    <option key={teamUser.id} value={teamUser.id}>
                      {teamUser.nombreCompleto || teamUser.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Monto</label>
                  <NumericInput
                    required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.monto}
                    onChange={(val) => setFormData({ ...formData, monto: val.toString() })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Periodo</label>
                  <input
                    type="text"
                    placeholder="04-2026"
                    required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.periodo}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Fecha de Pago</label>
                <input
                  type="date"
                  required
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Método</label>
                <select
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 ml-1">Observaciones</label>
                <textarea
                  rows={2}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                />
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
