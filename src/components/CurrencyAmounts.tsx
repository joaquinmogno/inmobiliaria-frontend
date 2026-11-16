import { formatCurrencyWithCents, type Moneda } from '../utils/currency';

export default function CurrencyAmounts({ amounts }: { amounts: ReadonlyArray<{ moneda: Moneda; monto: number }> }) {
    return <>{amounts.map(({ moneda, monto }) => <span key={moneda} className="block tabular-nums">
        {formatCurrencyWithCents(monto, moneda)} <span className="text-xs font-medium">{moneda}</span>
    </span>)}</>;
}
