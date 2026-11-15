import api, { openAuthenticatedPdf } from './api';

export type ReceiptModule = 'cajachica' | 'control-interno' | 'teodoro' | 'daniel';
export type ReceiptFields = { pagador: string; receptor: string; documentoReceptor: string; inmueble: string; descripcion: string };
export type ReceiptInput = ReceiptFields & { motivo: string; huellaMovimiento: string; ultimaVersion: number };
export type ReceiptContext = {
    movimiento: { id: number; tipo: 'INGRESO' | 'EGRESO'; concepto: string; monto: string; moneda: 'ARS' | 'USD'; fecha: string; metodoPago: string | null };
    huellaMovimiento: string; ultimaVersion: number; puedeEmitir: boolean; bloqueo: string | null; numero: string | null;
    datos: ReceiptFields;
    versiones: { version: number; fechaEmision: string; creadoPor: string; motivo: string | null; estado: 'VIGENTE' | 'ANULADO' | 'REEMPLAZADO' | 'DESACTUALIZADO' }[];
};
const base = (module: ReceiptModule, id: number) => `/${module}/${id}/recibos`;
export const movementReceiptService = {
    context: (module: ReceiptModule, id: number) => api.get<ReceiptContext>(base(module, id)),
    preview: async (module: ReceiptModule, id: number, input: ReceiptInput) => {
        const { pdf } = await api.post<{ pdf: string }>(`${base(module, id)}/vista-previa`, input);
        const bytes = Uint8Array.from(atob(pdf), char => char.charCodeAt(0));
        return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    },
    issue: (module: ReceiptModule, id: number, input: ReceiptInput) => api.post<{ numero: string; version: number; creada: boolean }>(base(module, id), input),
    open: (module: ReceiptModule, id: number, version: number) => openAuthenticatedPdf(`${base(module, id)}/${version}/pdf`)
};
