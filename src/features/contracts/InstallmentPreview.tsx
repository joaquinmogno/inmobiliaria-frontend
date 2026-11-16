import { useEffect, useState } from 'react';
import { planesCuotasService, type InstallmentPreview, type InstallmentPreviewInput } from '../../services/planes-cuotas.service';
import { formatCurrencyWithCents } from '../../utils/currency';
import { formatMonthYear } from '../../utils/date';

export function useInstallmentPreview(enabled: boolean, input: InstallmentPreviewInput) {
    const valid = enabled && input.montoTotal > 0 && Number.isInteger(input.cantidadCuotas)
        && input.cantidadCuotas >= 1 && input.cantidadCuotas <= 120 && /^\d{4}-\d{2}-01$/.test(input.fechaPrimeraCuota);
    const key = valid ? JSON.stringify(input) : '';
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ key: string; data?: InstallmentPreview; error?: string }>({ key: '' });
    useEffect(() => {
        if (!key) return;
        let active = true;
        setResult({ key: '' });
        const timer = window.setTimeout(() => {
            planesCuotasService.preview(JSON.parse(key)).then(data => {
                if (active) setResult({ key, data });
            }).catch(error => {
                if (active) setResult({ key, error: error instanceof Error ? error.message : 'No se pudo calcular la vista previa.' });
            });
        }, 200);
        return () => { active = false; window.clearTimeout(timer); };
    }, [key, attempt]);
    return {
        preview: key && result.key === key ? result.data : undefined,
        error: key && result.key === key ? result.error : undefined,
        loading: Boolean(key && (result.key !== key || (!result.data && !result.error))),
        retry: () => setAttempt(value => value + 1)
    };
}

export default function InstallmentPreviewPanel({ preview, loading, error, retry }: ReturnType<typeof useInstallmentPreview>) {
    return <section aria-label="Vista previa de cuotas" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
        <h4 className="text-sm font-semibold text-indigo-950">Distribución de cuotas</h4>
        <div aria-live="polite" className="mt-1 text-xs text-slate-700">
            {loading ? 'Calculando cuotas…' : error ? <><span role="alert">{error}</span> <button type="button" onClick={retry} className="font-semibold text-indigo-700 underline">Reintentar</button></> : !preview ? 'Completá el total, la cantidad y el primer período para ver la distribución.' : `${preview.cuotas.length} cuotas · ${preview.moneda} ${formatCurrencyWithCents(preview.montoTotal, preview.moneda)}`}
        </div>
        {preview && <>
            <div tabIndex={0} role="region" aria-label="Detalle de vencimientos e importes" className="mt-2 max-h-48 overflow-y-auto rounded border border-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600">
                <table className="w-full text-xs tabular-nums"><thead className="sticky top-0 bg-indigo-50"><tr><th scope="col" className="p-2 text-left">Cuota</th><th scope="col" className="p-2 text-left">Vencimiento</th><th scope="col" className="p-2 text-right">Importe ({preview.moneda})</th></tr></thead>
                    <tbody>{preview.cuotas.map(item => <tr key={item.numeroCuota} className="border-t border-indigo-100"><td className="p-2">{item.numeroCuota}</td><td className="p-2">{formatMonthYear(item.fechaVencimiento)}</td><td className="p-2 text-right">{formatCurrencyWithCents(item.monto, preview.moneda)}</td></tr>)}</tbody>
                </table>
            </div>
            <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm font-semibold text-indigo-950"><span>Suma de cuotas</span><span>{preview.moneda} {formatCurrencyWithCents(preview.sumaCuotas, preview.moneda)}</span></p>
            <p className="mt-1 text-xs text-slate-700">La diferencia de centavos se asigna a la última cuota. Los vencimientos corresponden al primer día de cada mes.</p>
        </>}
    </section>;
}
