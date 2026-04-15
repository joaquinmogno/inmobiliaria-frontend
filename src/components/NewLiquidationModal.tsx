import { useState, Fragment } from "react";
import { Dialog, Transition, Combobox } from "@headlessui/react";
import { XMarkIcon, ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import type { Contract } from "../services/contracts.service";
import { planesCuotasService, type CuotaPlan } from "../services/planes-cuotas.service";

interface NewLiquidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contratoId: number, periodo: string, montoHonorarios?: number, porcentajeHonorarios?: number, cuotasIds?: number[]) => void;
    contracts: Contract[];
}

export default function NewLiquidationModal({ isOpen, onClose, onSave, contracts }: NewLiquidationModalProps) {
    const [selectedContractId, setSelectedContractId] = useState<string>("");
    const [query, setQuery] = useState("");
    const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    
    // Honorarios
    const [porcentajeHonorarios, setPorcentajeHonorarios] = useState<string>("");
    const [montoHonorarios, setMontoHonorarios] = useState<string>("");

    // Cuotas
    const [pendingCuotas, setPendingCuotas] = useState<CuotaPlan[]>([]);
    const [selectedCuotasIds, setSelectedCuotasIds] = useState<number[]>([]);
    const [isLoadingCuotas, setIsLoadingCuotas] = useState(false);

    // Filtrar contratos
    const filteredContracts = query === "" 
        ? contracts 
        : contracts.filter((c) => {
            const address = c.propiedad.direccion.toLowerCase();
            const floor = c.propiedad.piso?.toLowerCase() || "";
            const dept = c.propiedad.departamento?.toLowerCase() || "";
            const tenant = c.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto.toLowerCase() || "";
            const id = c.id.toString();
            const q = query.toLowerCase();
            
            return address.includes(q) || floor.includes(q) || dept.includes(q) || tenant.includes(q) || id.includes(q);
        });

    // Autocompletar honorarios cuando cambia el contrato o el porcentaje
    const handleContractChange = async (cId: string | null) => {
        if (!cId) {
            setSelectedContractId("");
            setPorcentajeHonorarios("");
            setMontoHonorarios("");
            setPendingCuotas([]);
            setSelectedCuotasIds([]);
            return;
        }

        setSelectedContractId(cId);
        
        const contract = contracts.find((c: Contract) => c.id === Number(cId));
        if (contract) {
            const perc = contract.porcentajeHonorarios || "";
            setPorcentajeHonorarios(perc.toString());
            
            // Calculamos sugerido
            if (perc && Number(perc) > 0) {
                const calculated = (Number(contract.montoAlquiler) * Number(perc)) / 100;
                setMontoHonorarios(calculated.toString());
            } else {
                setMontoHonorarios(contract.montoHonorarios?.toString() || "");
            }

            // Fetch cuotas pendientes
            setIsLoadingCuotas(true);
            try {
                const cuotas = await planesCuotasService.getPendientes(contract.id);
                setPendingCuotas(cuotas);
                // Pre-seleccionar todas por defecto (usualmente se quieren cobrar todas las vencidas)
                setSelectedCuotasIds(cuotas.map(c => c.id));
            } catch (error) {
                console.error("Error fetching cuotas", error);
            } finally {
                setIsLoadingCuotas(false);
            }
        } else {
            setPorcentajeHonorarios("");
            setMontoHonorarios("");
            setPendingCuotas([]);
            setSelectedCuotasIds([]);
        }
    };

    const handlePorcentajeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPorcentajeHonorarios(val);
        
        const contract = contracts.find(c => c.id === Number(selectedContractId));
        if (contract && val && !isNaN(Number(val))) {
            const calculated = (Number(contract.montoAlquiler) * Number(val)) / 100;
            setMontoHonorarios(calculated.toString());
        }
    };

    const selectedContract = contracts.find(c => c.id === Number(selectedContractId));
    const selectedCuotas = pendingCuotas.filter(c => selectedCuotasIds.includes(c.id));
    
    const totalIngresosInquilino = selectedCuotas
        .filter(c => c.plan?.tipoMovimiento === 'INGRESO')
        .reduce((sum, c) => sum + Number(c.monto), 0);
        
    const totalDescuentosInquilino = selectedCuotas
        .filter(c => c.plan?.tipoMovimiento === 'DESCUENTO' && !c.plan?.esParaInmobiliaria)
        .reduce((sum, c) => sum + Number(c.monto), 0);

    const totalCuotasParaInmo = selectedCuotas
        .filter(c => c.plan?.esParaInmobiliaria)
        .reduce((sum, c) => sum + Number(c.monto), 0);

    const alquiler = selectedContract ? Number(selectedContract.montoAlquiler) : 0;
    const honorarios = Number(montoHonorarios) || 0;
    
    const totalInquilino = alquiler + totalIngresosInquilino - totalDescuentosInquilino;
    const totalPropietario = totalInquilino - honorarios - totalCuotasParaInmo;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedContractId && period) {
            onSave(
                Number(selectedContractId), 
                `${period}-01`, 
                montoHonorarios ? Number(montoHonorarios) : undefined,
                porcentajeHonorarios ? Number(porcentajeHonorarios) : undefined,
                selectedCuotasIds
            );
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                                        Nueva Liquidación
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                                            Contrato
                                        </label>
                                        <Combobox value={selectedContractId} onChange={handleContractChange}>
                                            <div className="relative mt-1">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 sm:text-sm transition-all">
                                                    <Combobox.Input
                                                        className="w-full border-none py-2 pl-4 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 outline-none"
                                                        displayValue={(cId: string) => {
                                                            const c = contracts.find(contract => contract.id === Number(cId));
                                                            if (!c) return "";
                                                            const principalTenant = c.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || '-';
                                                            return `${c.propiedad.direccion} - ${principalTenant}`;
                                                        }}
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder="Buscar por dirección o inquilino..."
                                                    />
                                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronUpDownIcon
                                                            className="h-5 w-5 text-gray-400"
                                                            aria-hidden="true"
                                                        />
                                                    </Combobox.Button>
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    leave="transition ease-in duration-100"
                                                    leaveFrom="opacity-100"
                                                    leaveTo="opacity-0"
                                                    afterLeave={() => setQuery("")}
                                                >
                                                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                                                        {filteredContracts.length === 0 && query !== "" ? (
                                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                                No se encontraron contratos.
                                                            </div>
                                                        ) : (
                                                            filteredContracts.map((c) => (
                                                                <Combobox.Option
                                                                    key={c.id}
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                            active ? "bg-indigo-600 text-white" : "text-gray-900"
                                                                        }`
                                                                    }
                                                                    value={c.id.toString()}
                                                                >
                                                                    {({ selected, active }) => (
                                                                        <>
                                                                            <span
                                                                                className={`block truncate ${
                                                                                    selected ? "font-medium" : "font-normal"
                                                                                }`}
                                                                            >
                                                                                <span className="font-bold">{c.propiedad.direccion}</span>
                                                                                {c.propiedad.piso && ` ${c.propiedad.piso}`}
                                                                                {c.propiedad.departamento && ` ${c.propiedad.departamento}`}
                                                                                <span className={active ? "text-indigo-100" : "text-gray-500"}>
                                                                                    {" "} - {c.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || '-'}
                                                                                </span>
                                                                            </span>
                                                                            {selected ? (
                                                                                <span
                                                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                                        active ? "text-white" : "text-indigo-600"
                                                                                    }`}
                                                                                >
                                                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                                                </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        )}
                                                    </Combobox.Options>
                                                </Transition>
                                            </div>
                                        </Combobox>
                                        {contracts.length === 0 && (
                                            <p className="mt-2 text-xs text-red-500 font-medium">
                                                No se encontraron contratos activos. Crea o activa un contrato primero.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                                            Periodo (Mes/Año)
                                        </label>
                                        <input
                                            type="month"
                                            required
                                            className="block w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white"
                                            value={period}
                                            onChange={(e) => setPeriod(e.target.value)}
                                        />
                                    </div>

                                    {/* Honorarios overrides */}
                                    {selectedContractId && (
                                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                                Honorarios de Inmobiliaria
                                                <span className="text-xs font-normal text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Sugerido del contrato</span>
                                            </h4>
                                            <p className="text-xs text-indigo-600/80 leading-relaxed">
                                                Estos valores se guardarán exclusivamente para esta liquidación mensual. Podés modificarlos si este mes hubo un acuerdo diferente.
                                            </p>
                                            <div className="flex gap-4">
                                                <div className="w-1/3">
                                                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">
                                                        Porcentaje (%)
                                                    </label>
                                                    <NumericInput
                                                        className="block w-full px-3 py-2 text-gray-900 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white"
                                                        value={porcentajeHonorarios}
                                                        onChange={(val) => handlePorcentajeChange({ target: { value: val.toString() } } as any)}
                                                        placeholder="Ej: 5"
                                                    />
                                               </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">
                                                        Monto ($)
                                                    </label>
                                                    <NumericInput
                                                        className="block w-full pr-4 py-2 text-gray-900 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white font-bold"
                                                        value={montoHonorarios}
                                                        onChange={(val) => setMontoHonorarios(val.toString())}
                                                        placeholder="0.00"
                                                        icon={<span className="text-gray-500 sm:text-sm">$</span>}
                                                    />
                                               </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cuotas Selection */}
                                    {selectedContractId && (pendingCuotas.length > 0 || isLoadingCuotas) && (
                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                                                Planes de Cuotas / Préstamos
                                            </label>
                                            {isLoadingCuotas ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                                                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                    Buscando cuotas pendientes...
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                                                    {pendingCuotas.map(cuota => (
                                                        <label key={cuota.id} className="flex items-center justify-between p-3 hover:bg-gray-100 transition-colors cursor-pointer group">
                                                            <div className="flex items-center gap-3">
                                                                <input 
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                                    checked={selectedCuotasIds.includes(cuota.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedCuotasIds([...selectedCuotasIds, cuota.id]);
                                                                        } else {
                                                                            setSelectedCuotasIds(selectedCuotasIds.filter(id => id !== cuota.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{cuota.plan?.concepto}</p>
                                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-1">
                                                                        Cuota {cuota.numeroCuota} • {cuota.plan?.tipoMovimiento === 'INGRESO' ? 'Paga Inquilino' : 'Descuento Dueño'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="text-sm font-black text-gray-900">
                                                                ${Number(cuota.monto).toLocaleString('es-AR')}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Summary section */}
                                    {selectedContractId && (
                                        <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm">
                                            <h4 className="text-[10px] font-black text-indigo-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                Resumen de Liquidación
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Inquilino paga</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">Alquiler + Ingresos (+)</span>
                                                    </div>
                                                    <span className="text-xl font-black text-gray-900">
                                                        ${totalInquilino.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center pt-3 border-t border-indigo-100/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Honorarios Inmob.</span>
                                                        <span className="text-[10px] text-indigo-400 font-medium">Comisión de la agencia</span>
                                                    </div>
                                                    <span className="text-lg font-black text-indigo-600">
                                                        ${honorarios.toLocaleString('es-AR')}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center pt-3 border-t border-indigo-100/50 p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-indigo-100 uppercase tracking-widest">Dueño recibe</span>
                                                        <span className="text-[10px] text-indigo-200 font-medium">Liquidez neta (-)</span>
                                                    </div>
                                                    <span className="text-xl font-black text-white">
                                                        ${totalPropietario.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!selectedContractId || contracts.length === 0}
                                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            Crear Borrador
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
