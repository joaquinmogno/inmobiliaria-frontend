import { Dialog, Transition } from "@headlessui/react";
import { NoSymbolIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useEffect, useState } from "react";
import { todayDateInput } from "../utils/date";

interface ContractRescissionModalProps {
    isOpen: boolean;
    contractLabel: string;
    onClose: () => void;
    onConfirm: (data: { motivo: string; fechaRescision: string }) => Promise<void>;
}

const today = () => todayDateInput();

export default function ContractRescissionModal({ isOpen, contractLabel, onClose, onConfirm }: ContractRescissionModalProps) {
    const [motivo, setMotivo] = useState("");
    const [fechaRescision, setFechaRescision] = useState(today());
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMotivo("");
            setFechaRescision(today());
            setError("");
        }
    }, [isOpen]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedReason = motivo.trim();
        if (normalizedReason.length < 5) {
            setError("Ingresá un motivo de al menos 5 caracteres.");
            return;
        }
        setIsSubmitting(true);
        setError("");
        try {
            await onConfirm({ motivo: normalizedReason, fechaRescision });
            onClose();
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : "No se pudo rescindir el contrato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={() => !isSubmitting && onClose()}>
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:scale-95">
                            <Dialog.Panel className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-orange-100 p-2 text-orange-700"><NoSymbolIcon className="h-6 w-6" /></div>
                                    <div className="min-w-0 flex-1">
                                        <Dialog.Title className="text-lg font-bold text-gray-900">Rescindir contrato</Dialog.Title>
                                        <Dialog.Description className="mt-1 text-sm text-gray-600">{contractLabel}. La rescisión conserva todo el historial; no puede realizarse si hay saldos u obligaciones pendientes.</Dialog.Description>
                                    </div>
                                    <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg p-1 text-content-muted hover:bg-gray-100 disabled:opacity-50" aria-label="Cerrar"><XMarkIcon className="h-5 w-5" /></button>
                                </div>
                                <form onSubmit={submit} className="mt-5 space-y-4">
                                    <div>
                                        <label htmlFor="rescission-date" className="mb-1 block text-sm font-semibold text-gray-700">Fecha efectiva *</label>
                                        <input id="rescission-date" type="date" required max={today()} value={fechaRescision} onChange={event => setFechaRescision(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200" />
                                    </div>
                                    <div>
                                        <label htmlFor="rescission-reason" className="mb-1 block text-sm font-semibold text-gray-700">Motivo de la rescisión *</label>
                                        <textarea id="rescission-reason" rows={3} required minLength={5} maxLength={1000} autoFocus value={motivo} onChange={event => setMotivo(event.target.value)} placeholder="Ej. Acuerdo anticipado entre las partes" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200" />
                                    </div>
                                    {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
                                    <div className="flex gap-3 border-t border-gray-100 pt-4">
                                        <button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                                        <button type="submit" disabled={isSubmitting || motivo.trim().length < 5 || !fechaRescision} className="min-h-11 flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Rescindiendo…" : "Confirmar rescisión"}</button>
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
