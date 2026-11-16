import { pendingFinancialRequest } from '../services/financial-retry';
import { formatCurrencyWithCents } from '../utils/currency';

export default function FinancialRetryNotice({ endpoint, scope, disabled, onRetry }: {
    endpoint: string; scope?: string; disabled: boolean; onRetry: (body: string) => void;
}) {
    const pending = pendingFinancialRequest(endpoint, scope);
    if (!pending || disabled) return null;
    const payment = JSON.parse(pending.body);
    return <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <p>Hay un envío de {formatCurrencyWithCents(payment.monto, payment.moneda)} sin respuesta confirmada. Verificá esa operación antes de registrar otra.</p>
        <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => onRetry(pending.body)}>Verificar envío pendiente</button>
    </div>;
}
