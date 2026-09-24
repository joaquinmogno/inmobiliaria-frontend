import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { PencilSquareIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Persona } from "../services/personas.service";
import { getStatusLabel } from "../utils/status";

interface Props {
    isOpen: boolean;
    person: Persona | null;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (person: Persona) => void;
}

const displayedValue = (value: string | null | undefined) => value?.trim() || "Sin informar";

function InfoCard({ label, value }: { label: string; value: string | null | undefined }) {
    return <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{label}</p>
        <p className="mt-2 break-words text-sm font-semibold text-gray-950">{displayedValue(value)}</p>
    </div>;
}

export default function PersonDetailsModal({ isOpen, person, canEdit, onClose, onEdit }: Props) {
    if (!person) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
                <div className="flex min-h-full items-center justify-center">
                    <DialogPanel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-7">
                            <div className="min-w-0">
                                <DialogTitle className="truncate text-xl font-bold text-gray-950 sm:text-2xl">{person.nombreCompleto}</DialogTitle>
                                <p className="mt-1 text-sm text-gray-600">Ficha operativa de la persona</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {canEdit && <button
                                    type="button"
                                    onClick={() => { onClose(); onEdit(person); }}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                                >
                                    <PencilSquareIcon className="h-5 w-5" />
                                    <span className="hidden sm:inline">Editar</span>
                                </button>}
                                <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[calc(100vh-8rem)] space-y-7 overflow-y-auto p-5 sm:p-7">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${person.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{getStatusLabel(person.estado)}</span>
                                {person.roles?.map(role => <span key={role} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">{role}</span>)}
                                {!person.roles?.length && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Sin roles</span>}
                            </div>

                            <section aria-labelledby="person-identification-title">
                                <div className="mb-3 flex items-center gap-2">
                                    <UserGroupIcon className="h-5 w-5 text-indigo-700" />
                                    <h3 id="person-identification-title" className="text-lg font-bold text-gray-950">Identificación y contacto</h3>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <InfoCard label="DNI" value={person.dni} />
                                    <InfoCard label="CUIT" value={person.cuit} />
                                    <InfoCard label="Email" value={person.email} />
                                    <InfoCard label="Teléfono" value={person.telefono} />
                                    <InfoCard label="Contacto alternativo" value={person.contactoAlternativo} />
                                    <InfoCard label="Teléfono alternativo" value={person.telefonoAlternativo} />
                                    <InfoCard label="Dirección" value={person.direccion} />
                                </div>
                            </section>

                            <section aria-labelledby="person-bank-title">
                                <h3 id="person-bank-title" className="mb-3 text-lg font-bold text-gray-950">Datos bancarios</h3>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <InfoCard label="Banco" value={person.banco} />
                                    <InfoCard label="CBU" value={person.cbu} />
                                    <InfoCard label="Alias bancario" value={person.aliasBancario} />
                                    <InfoCard label="Titular de la cuenta" value={person.titularCuentaBancaria || person.nombreCompleto} />
                                    <InfoCard label="Titularidad" value={person.titularidadBancariaVerificada ? "Verificada" : "Pendiente de verificar"} />
                                </div>
                            </section>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
