import { useState, type FormEvent } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Liquidacion } from '../../services/liquidaciones.service';
import { formatCurrency } from '../../utils/currency';
import { addMonthsToDateInput, formatDate } from '../../utils/date';

export interface RentUpdateInput {
    montoNuevo: number;
    alcance: 'SOLO_PERIODO' | 'DESDE_PERIODO';
    motivo: string;
    fechaProximaNueva?: string;
    porcentajeAplicado?: number;
}

interface Props {
    mode: 'ALQUILER' | 'HONORARIOS';
    liquidacion: Liquidacion;
    canEditContracts: boolean;
    onClose: () => void;
    onSaveRent: (data: RentUpdateInput) => Promise<boolean>;
    onSaveFees: (data: { porcentajeHonorarios: number; motivo: string }) => Promise<boolean>;
}

export default function LiquidationTermsModal({ mode, liquidacion, canEditContracts, onClose, onSaveRent, onSaveFees }: Props) {
    const contract = liquidacion.contrato;
    const finalMonth = Boolean(contract?.fechaEntregaLlaves && contract.fechaEntregaLlaves.slice(0, 7) === liquidacion.periodo.slice(0, 7));
    const due = Boolean(!finalMonth && contract?.requiereActualizacion && contract.fechaProximaActualizacion && contract.fechaProximaActualizacion.slice(0, 7) <= liquidacion.periodo.slice(0, 7));
    const update = contract?.actualizaciones?.find(item => item.fechaVigencia?.slice(0, 7) === liquidacion.periodo.slice(0, 7));
    const canUpdateContract = canEditContracts && !finalMonth && (due || Boolean(update));
    const [scope, setScope] = useState<RentUpdateInput['alcance']>(canUpdateContract ? 'DESDE_PERIODO' : 'SOLO_PERIODO');
    const [rent, setRent] = useState(Number(liquidacion.montoAlquilerBase));
    const [percentage, setPercentage] = useState(String(liquidacion.porcentajeHonorarios ?? 5));
    const [reason, setReason] = useState('');
    const [nextDate, setNextDate] = useState('');
    const [saving, setSaving] = useState(false);
    const isRent = mode === 'ALQUILER';
    const validRent = Number.isFinite(rent) && rent > 0;
    const rate = Number(percentage);
    const validRate = percentage !== '' && Number.isFinite(rate) && rate >= 0 && rate <= 100;
    const fee = isRent
        ? liquidacion.porcentajeHonorarios == null ? Number(liquidacion.montoHonorarios) : Math.round(rent * Number(liquidacion.porcentajeHonorarios)) / 100
        : Math.round(Number(liquidacion.montoAlquilerBase) * rate) / 100;
    const rentDifference = isRent ? rent - Number(liquidacion.montoAlquilerBase) : 0;
    const ownerPreview = Number(liquidacion.montoPropietario) + rentDifference - (fee - Number(liquidacion.montoHonorarios))
        - (liquidacion.pagaHonorarios === 'INQUILINO' ? Number(liquidacion.montoHonorarios) : 0);
    const scheduledFrom = update?.fechaProximaAnterior || contract?.fechaProximaActualizacion;
    const frequency = contract?.frecuenciaActualizacionMeses;
    const monthsBetween = scheduledFrom
        ? (Number(liquidacion.periodo.slice(0, 4)) - Number(scheduledFrom.slice(0, 4))) * 12 + Number(liquidacion.periodo.slice(5, 7)) - Number(scheduledFrom.slice(5, 7))
        : 0;
    const suggestedNextDate = scheduledFrom && frequency
        ? addMonthsToDateInput(scheduledFrom, Math.max(1, Math.floor(monthsBetween / frequency) + 1) * frequency)
        : '';
    const close = () => { if (!saving) onClose(); };
    const valid = (isRent ? validRent : validRate) && ownerPreview >= 0 && reason.trim().length >= 5
        && (!isRent || scope !== 'DESDE_PERIODO' || Boolean(suggestedNextDate || nextDate));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!valid || saving) return;
        setSaving(true);
        try {
            const saved = isRent
                ? await onSaveRent({ montoNuevo: rent, alcance: scope, motivo: reason.trim(), ...(scope === 'DESDE_PERIODO' ? { fechaProximaNueva: suggestedNextDate || nextDate } : {}) })
                : await onSaveFees({ porcentajeHonorarios: rate, motivo: reason.trim() });
            if (saved) onClose();
        } finally { setSaving(false); }
    };
    const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

    return <Dialog open onClose={close} className="relative z-[100]">
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-5">
            <DialogPanel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                    <DialogTitle className="text-xl font-black text-gray-950">{isRent ? 'Editar alquiler' : 'Editar honorarios'}</DialogTitle>
                    <button type="button" onClick={close} disabled={saving} aria-label="Cerrar edición" className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <form id="liquidation-terms-form" onSubmit={event => void submit(event)} className="space-y-4 overflow-y-auto px-5 py-4">
                    {isRent ? <>
                        <p className="text-sm text-gray-700">Ingresá el alquiler mensual completo actualizado. El valor vigente está precargado y podés reemplazarlo manualmente.</p>
                        <div><label htmlFor="liquidation-rent-amount" className="text-sm font-bold text-gray-800">Alquiler mensual completo ({liquidacion.moneda})</label><input id="liquidation-rent-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={rent || ''} onChange={event => setRent(Number(event.target.value))} required className={inputClass} /></div>
                        <p className="text-xs text-gray-600">Ejemplo: si pasa de $1.500.000 a $1.550.000, ingresá $1.550.000.</p>
                        <label className="block text-sm font-bold text-gray-800">Aplicar cambio a<select value={scope} onChange={event => setScope(event.target.value as RentUpdateInput['alcance'])} className={inputClass}>
                            <option value="SOLO_PERIODO">Solo esta liquidación (excepción manual)</option>
                            {canUpdateContract && <option value="DESDE_PERIODO">Este mes y siguientes (actualización del contrato)</option>}
                        </select></label>
                        {finalMonth && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cargá el importe acordado hasta la entrega de llaves. Los días se calculan manualmente.</p>}
                        {due && scope === 'SOLO_PERIODO' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La actualización del contrato está pendiente. Antes de confirmar deberá guardarse para este mes y siguientes por alguien con permiso de edición de contratos.</p>}
                        {scope === 'DESDE_PERIODO' && (suggestedNextDate
                            ? <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">Próxima actualización: <strong>{formatDate(suggestedNextDate)}</strong> · cada {frequency} meses.</p>
                            : <label className="block text-sm font-bold text-gray-800">Próxima actualización<input type="date" required value={nextDate} onChange={event => setNextDate(event.target.value)} min={addMonthsToDateInput(`${liquidacion.periodo.slice(0, 7)}-01`, 1)} className={inputClass} /></label>)}
                    </> : <>
                        <p className="text-sm text-gray-700">El porcentaje se aplica al alquiler completo de {formatCurrency(Number(liquidacion.montoAlquilerBase), liquidacion.moneda)} y se descuenta del neto del propietario.</p>
                        <label className="block text-sm font-bold text-gray-800">Porcentaje acordado (%)<input type="number" min="0" max="100" step="0.01" required value={percentage} onChange={event => setPercentage(event.target.value)} className={inputClass} /></label>
                    </>}
                    <label className="block text-sm font-bold text-gray-800">Motivo del cambio<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={5} maxLength={1000} rows={2} placeholder={isRent ? 'Ej.: actualización según IPC o acuerdo del período' : 'Ej.: porcentaje acordado en el contrato'} className={`${inputClass} py-2`} /></label>
                    <div aria-live="polite" className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950">
                        <p className="mb-2 font-black">Vista previa · {liquidacion.moneda}</p>
                        <p className="flex justify-between gap-3">Alquiler completo <strong>{formatCurrency(isRent ? rent : Number(liquidacion.montoAlquilerBase), liquidacion.moneda)}</strong></p>
                        <p className="mt-1 flex justify-between gap-3">Honorarios <strong>{formatCurrency(fee, liquidacion.moneda)}</strong></p>
                        <p className="mt-2 flex justify-between gap-3 border-t border-indigo-200 pt-2">Neto propietario <strong>{formatCurrency(ownerPreview, liquidacion.moneda)}</strong></p>
                        <p className="mt-2 text-xs">Incluye los otros conceptos de esta moneda. Los importes en otra moneda conservan su saldo.</p>
                        {ownerPreview < 0 && <p role="alert" className="mt-2 font-bold text-red-800">El neto del propietario debe ser mayor o igual a cero.</p>}
                    </div>
                </form>
                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4">
                    <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cancelar</button>
                    <button type="submit" form="liquidation-terms-form" disabled={!valid || saving} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar y recalcular'}</button>
                </div>
            </DialogPanel>
        </div>
    </Dialog>;
}
