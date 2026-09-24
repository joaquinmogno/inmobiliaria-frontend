import { useState, useEffect } from "react";
import { sueldosService, type PagoSueldo } from "../services/sueldos.service";
import { usersService } from "../services/users.service";
import { useAuth } from "../context/AuthContext";
import { ArrowPathIcon, BanknotesIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { type User } from "../services/auth.service";
import { hasPermission } from "../utils/permissions";
import NumericInput from "../components/NumericInput";
import { formatCurrency, type Moneda } from "../utils/currency";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import FormError, { useFormError } from "../components/FormError";
import ServerPagination from "../components/ServerPagination";
import AppSelect from "../components/AppSelect";
import { PAYMENT_METHOD_OPTIONS } from "../services/pagos.service";
import { currentMonthInput, formatDate, formatMonthYear, todayDateInput } from "../utils/date";

const initialFormData = () => ({
	  usuarioId: "",
	  monto: "",
	  moneda: "ARS" as Moneda,
	  fecha: todayDateInput(),
  periodo: currentMonthInput(),
  metodoPago: "EFECTIVO",
  observaciones: "",
});

type SalaryAdjustmentForm = {
  tipo: "PAGO_ADICIONAL" | "RECUPERO";
  monto: string;
  metodoPago: string;
  motivo: string;
};

const initialAdjustmentData = (): SalaryAdjustmentForm => ({
  tipo: "PAGO_ADICIONAL",
  monto: "",
  metodoPago: "EFECTIVO",
  motivo: "",
});

export default function Sueldos() {
  const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
  const { user } = useAuth();
  const canView = hasPermission(user, "sueldos.ver");
  const canCreate = hasPermission(user, "sueldos.crear");
  const canEdit = hasPermission(user, "sueldos.editar");
  const canDelete = hasPermission(user, "sueldos.eliminar");

  const [sueldos, setSueldos] = useState<PagoSueldo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingSueldo, setEditingSueldo] = useState<PagoSueldo | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [adjustingSueldo, setAdjustingSueldo] = useState<PagoSueldo | null>(null);
  const [adjustmentData, setAdjustmentData] = useState(initialAdjustmentData);

  useEffect(() => {
    fetchData();
  }, [canView, canCreate, canEdit, page]);

  const fetchData = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sueldosRes, usersRes] = await Promise.all([
        sueldosService.getAll(page, 25),
        canCreate || canEdit ? usersService.getOptions() : Promise.resolve([]),
      ]);
      setSueldos(sueldosRes.data || []);
      setTotal(sueldosRes.meta.total);
      setTotalPages(sueldosRes.meta.totalPages);
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
	      moneda: sueldo.moneda || "ARS",
	      fecha: sueldo.fecha.slice(0, 10),
      periodo: sueldo.periodo,
      metodoPago: sueldo.metodoPago,
      observaciones: sueldo.observaciones || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      const payload = {
        ...formData,
        usuarioId: Number(formData.usuarioId),
        monto: Number(formData.monto),
      };

      if (editingSueldo) {
        await sueldosService.update(editingSueldo.id, { ...payload, version: editingSueldo.version });
      } else {
        await sueldosService.create(payload);
      }

      setShowModal(false);
      setEditingSueldo(null);
      fetchData();
    } catch (error) {
      reportError(error, editingSueldo ? "No se pudo editar el sueldo" : "No se pudo registrar el sueldo");
    }
  };

  const handleDelete = async (sueldo: PagoSueldo) => {
    if (!await requestConfirmation({ title: "Eliminar pago de sueldo", message: `Se eliminará el pago de ${sueldo.usuario.nombreCompleto} del período ${formatMonthYear(`${sueldo.periodo}-01`)}.`, confirmText: "Eliminar" })) {
      return;
    }

    try {
      await sueldosService.delete(sueldo.id);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el sueldo");
    }
  };

  const openAdjustmentModal = (sueldo: PagoSueldo) => {
    setAdjustingSueldo(sueldo);
    setAdjustmentData(initialAdjustmentData());
  };

  const handleAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustingSueldo) return;

    try {
      await sueldosService.createAjuste(adjustingSueldo.id, {
        ...adjustmentData,
        monto: Number(adjustmentData.monto),
      });
      toast.success("Ajuste de sueldo registrado en la caja del período actual");
      setAdjustingSueldo(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el ajuste");
    }
  };

  if (!canView) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-content-muted mt-2">No tenés permisos para ver el módulo de sueldos.</p>
      </div>
    );
  }

  const hasRowActions = canEdit || canDelete;
  const columnCount = hasRowActions ? 7 : 6;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de sueldos</h1>
          <p className="text-content-muted text-sm">Registrá y consultá los pagos de sueldos del equipo.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="flex min-h-11 items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <PlusIcon className="w-5 h-5" />
            Registrar pago de sueldo
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100 2xl:hidden">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600">Cargando...</div>
          ) : sueldos.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-content-muted">No hay pagos registrados.</div>
          ) : (
            sueldos.map((sueldo) => (
              <article key={sueldo.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {sueldo.usuario.nombreCompleto.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black leading-tight text-gray-900">{sueldo.usuario.nombreCompleto}</h3>
                      <p className="break-all text-xs text-content-muted">{sueldo.usuario.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black font-mono text-gray-900">{formatCurrency(Number(sueldo.monto), sueldo.moneda)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-700">{formatMonthYear(`${sueldo.periodo}-01`)}</span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">{sueldo.metodoPago}</span>
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 font-bold text-content-muted">{formatDate(sueldo.fecha)}</span>
                </div>
                {sueldo.ajustes?.length > 0 && (
                  <p className="mt-3 text-xs font-semibold text-amber-700">{sueldo.ajustes.length} ajuste{sueldo.ajustes.length === 1 ? "" : "s"} registrado{sueldo.ajustes.length === 1 ? "" : "s"}</p>
                )}
                {hasRowActions && (
                  <div className="mt-4 grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-3">
                    {canEdit && <button onClick={() => openEditModal(sueldo)} className="min-h-11 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-700">Editar</button>}
                    {canEdit && <button onClick={() => openAdjustmentModal(sueldo)} className="min-h-11 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-800">Ajustar</button>}
                    {canDelete && <button onClick={() => handleDelete(sueldo)} data-danger-trigger="true" className="destructive-action min-h-11 rounded-xl px-3 text-xs font-bold transition-colors">Eliminar</button>}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto 2xl:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Periodo</th>
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Método</th>
                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Registrado por</th>
                {hasRowActions && <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-6 py-10 text-center">
                    <div className="flex justify-center flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-600 text-sm">Cargando...</p>
                    </div>
                  </td>
                </tr>
              ) : sueldos.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-6 py-10 text-center text-content-muted">
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
                          <p className="text-xs text-content-muted">{sueldo.usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {formatMonthYear(`${sueldo.periodo}-01`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
	                      {formatCurrency(Number(sueldo.monto), sueldo.moneda)}
                      {sueldo.ajustes?.length > 0 && <p className="mt-1 font-sans text-xs font-semibold text-amber-700">{sueldo.ajustes.length} ajuste{sueldo.ajustes.length === 1 ? "" : "s"}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(sueldo.fecha)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {sueldo.metodoPago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-content-muted">{sueldo.creadoPor.nombreCompleto}</td>
                    {hasRowActions && (
                      <td className="sticky right-0 z-10 bg-white px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(sueldo)}
                              className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-blue-700 transition-colors"
                              title="Editar sueldo"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => openAdjustmentModal(sueldo)}
                              className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-amber-700 transition-colors"
                              title="Registrar ajuste de sueldo"
                            >
                              <ArrowPathIcon className="w-5 h-5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(sueldo)}
                              data-danger-trigger="true"
                              className="destructive-icon-action inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
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
      <ServerPagination page={page} totalPages={totalPages} total={total} pageSize={25} currentCount={sueldos.length} onPageChange={setPage} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in zoom-in duration-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="shrink-0 border-b border-gray-100 p-5 sm:p-8 sm:pb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <BanknotesIcon className="w-7 h-7 text-indigo-600" />
                {editingSueldo ? "Editar pago de sueldo" : "Registrar pago de sueldo"}
              </h2>
            </div>
            <form ref={formRef} onSubmit={handleSave} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 sm:pt-4 space-y-4">
              <FormError message={formError} />
              <div>
                <label htmlFor="salary-employee" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Empleado</label>
                <AppSelect
                  id="salary-employee"
                  required
                  ariaLabel="Empleado"
                  value={formData.usuarioId}
                  onChange={(value) => setFormData({ ...formData, usuarioId: value })}
                  options={[{ value: "", label: "Seleccionar empleado…", disabled: true }, ...users.map(teamUser => ({ value: String(teamUser.id), label: teamUser.nombreCompleto || teamUser.fullName }))]}
                  buttonClassName="border-transparent bg-gray-50"
                />
              </div>

	              <div className="grid grid-cols-[120px_1fr] gap-4">
	                <div>
	                  <label htmlFor="salary-currency" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Moneda</label>
	                  <AppSelect id="salary-currency" ariaLabel="Moneda" value={formData.moneda} onChange={(value) => setFormData({ ...formData, moneda: value as Moneda })} options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]} buttonClassName="border-transparent bg-gray-50" />
	                </div>
	                <div>
	                  <label htmlFor="salary-amount" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Monto</label>
                  <NumericInput
                    id="salary-amount"
                    required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.monto}
                    onChange={(val) => setFormData({ ...formData, monto: val.toString() })}
                  />
                </div>
                <div>
                  <label htmlFor="salary-period" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Periodo</label>
                  <input
                    id="salary-period"
                    type="month"
                    required
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.periodo}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="salary-payment-date" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Fecha de Pago</label>
                <input
                  id="salary-payment-date"
                  type="date"
                  required
                  max={todayDateInput()}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="salary-payment-method" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Método</label>
                <AppSelect id="salary-payment-method" ariaLabel="Método de pago" value={formData.metodoPago} onChange={(value) => setFormData({ ...formData, metodoPago: value })} options={PAYMENT_METHOD_OPTIONS} buttonClassName="border-transparent bg-gray-50" />
              </div>

              <div>
                <label htmlFor="salary-observations" className="block text-xs font-black uppercase text-content-muted mb-1.5 ml-1">Observaciones</label>
                <textarea
                  id="salary-observations"
                  rows={2}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                />
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t border-gray-100 bg-white p-5 sm:-mx-8 sm:-mb-8 sm:p-8">
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

      {adjustingSueldo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl animate-in zoom-in duration-200 sm:rounded-3xl sm:p-8">
            <div className="mb-5">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                <ArrowPathIcon className="h-7 w-7 text-amber-600" />
                Ajustar pago de sueldo
              </h2>
              <p className="mt-2 text-sm text-content-muted">
                El pago original de {adjustingSueldo.usuario.nombreCompleto} no se modifica. Este comprobante impacta en la caja de hoy.
              </p>
            </div>
            <form onSubmit={handleAdjustment} className="space-y-4">
              <div>
                <label htmlFor="salary-adjustment-type" className="mb-1.5 ml-1 block text-xs font-black uppercase text-content-muted">Tipo de ajuste</label>
                <AppSelect
                  id="salary-adjustment-type"
                  ariaLabel="Tipo de ajuste"
                  value={adjustmentData.tipo}
                  onChange={(value) => setAdjustmentData({ ...adjustmentData, tipo: value as "PAGO_ADICIONAL" | "RECUPERO" })}
                  options={[
                    { value: "PAGO_ADICIONAL", label: "Pago adicional al empleado" },
                    { value: "RECUPERO", label: "Recupero / devolución del empleado" },
                  ]}
                  buttonClassName="border-transparent bg-gray-50"
                />
              </div>
              <div>
                <label htmlFor="salary-adjustment-amount" className="mb-1.5 ml-1 block text-xs font-black uppercase text-content-muted">Monto ({adjustingSueldo.moneda})</label>
                <NumericInput
                  id="salary-adjustment-amount"
                  required
                  className="w-full rounded-xl border-none bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500"
                  value={adjustmentData.monto}
                  onChange={(value) => setAdjustmentData({ ...adjustmentData, monto: value.toString() })}
                />
              </div>
              <div>
                <label htmlFor="salary-adjustment-method" className="mb-1.5 ml-1 block text-xs font-black uppercase text-content-muted">Método</label>
                <AppSelect id="salary-adjustment-method" ariaLabel="Método de ajuste" value={adjustmentData.metodoPago} onChange={(value) => setAdjustmentData({ ...adjustmentData, metodoPago: value })} options={PAYMENT_METHOD_OPTIONS} buttonClassName="border-transparent bg-gray-50" />
              </div>
              <div>
                <label htmlFor="salary-adjustment-reason" className="mb-1.5 ml-1 block text-xs font-black uppercase text-content-muted">Motivo</label>
                <textarea id="salary-adjustment-reason" required minLength={5} rows={3} className="w-full rounded-xl border-none bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500" value={adjustmentData.motivo} onChange={(event) => setAdjustmentData({ ...adjustmentData, motivo: event.target.value })} />
              </div>
              <div className="flex gap-3 border-t border-gray-100 pt-5">
                <button type="button" onClick={() => setAdjustingSueldo(null)} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-700 hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-bold text-white shadow-lg shadow-amber-100 hover:bg-amber-700">Registrar ajuste</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
