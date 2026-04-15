import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import { planesCuotasService } from "../services/planes-cuotas.service";
import { toast } from "react-hot-toast";

interface NewPlanCuotasModalProps {
    isOpen: boolean;
    onClose: () => void;
    contratoId: number;
    onSuccess: () => void;
}

export default function NewPlanCuotasModal({ isOpen, onClose, contratoId, onSuccess }: NewPlanCuotasModalProps) {
    const [concepto, setConcepto] = useState("");
    const [montoTotal, setMontoTotal] = useState("");
    const [cantidadCuotas, setCantidadCuotas] = useState("1");
    const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'DESCUENTO'>('DESCUENTO');
    const [esParaInmobiliaria, setEsParaInmobiliaria] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concepto || !montoTotal || !cantidadCuotas) return;

        setIsSubmitting(true);
        try {
            await planesCuotasService.create({
                contratoId,
                concepto,
                montoTotal: Number(montoTotal),
                cantidadCuotas: Number(cantidadCuotas),
                tipoMovimiento,
                esParaInmobiliaria
            });
            toast.success("Plan de cuotas creado exitosamente");
            onSuccess();
            onClose();
            // Reset form
            setConcepto("");
            setMontoTotal("");
            setCantidadCuotas("1");
            setEsParaInmobiliaria(false);
        } catch (error) {
            console.error(error);
            toast.error("Error al crear el plan de cuotas");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                        Nuevo Plan de Cuotas
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                                            Concepto / Motivo
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Compra de Heladera, Honorarios Contrato, etc."
                                            className="block w-full px-4 py-2 text-sm border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
                                            value={concepto}
                                            onChange={(e) => setConcepto(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                                                Monto Total ($)
                                            </label>
                                            <NumericInput
                                                className="block w-full px-4 py-2 text-sm border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
                                                value={montoTotal}
                                                onChange={(val) => setMontoTotal(val.toString())}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                                                Cant. Cuotas
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                className="block w-full px-4 py-2 text-sm border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
                                                value={cantidadCuotas}
                                                onChange={(e) => setCantidadCuotas(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                                            Tipo de Movimiento / Destinatario
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTipoMovimiento('DESCUENTO');
                                                    setEsParaInmobiliaria(false);
                                                }}
                                                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                                    tipoMovimiento === 'DESCUENTO'
                                                        ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-100'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                DESCUENTO (Al Dueño)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipoMovimiento('INGRESO')}
                                                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                                    tipoMovimiento === 'INGRESO'
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                INGRESO (Paga Inquilino)
                                            </button>
                                        </div>

                                        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                                {tipoMovimiento === 'INGRESO' ? 'Destinatario del Cobro' : '¿A favor de quién es el descuento?'}
                                            </label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="destinatario" 
                                                        checked={!esParaInmobiliaria} 
                                                        onChange={() => setEsParaInmobiliaria(false)}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs text-gray-700">
                                                        {tipoMovimiento === 'INGRESO' ? 'Propietario' : 'Inquilino (Reintegro)'}
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="destinatario" 
                                                        checked={esParaInmobiliaria} 
                                                        onChange={() => setEsParaInmobiliaria(true)}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs text-gray-700">Inmobiliaria</span>
                                                </label>
                                            </div>
                                        </div>

                                        <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">
                                            {tipoMovimiento === 'DESCUENTO' 
                                                ? (esParaInmobiliaria 
                                                    ? "* Retención que se le hace al dueño y se la queda la Inmobiliaria (El inquilino paga completo)." 
                                                    : "* Reintegro al inquilino que se descuenta al dueño (El inquilino paga menos alquiler).")
                                                : (esParaInmobiliaria 
                                                    ? "* Lo paga el inquilino pero queda para la inmobiliaria (ej: heladera propia)."
                                                    : "* Lo paga el inquilino y se le entrega al propietario.")}
                                        </p>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !concepto || !montoTotal}
                                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? "Creando..." : "Crear Plan"}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
