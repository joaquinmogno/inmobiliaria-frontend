import type { ChangeEvent } from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const displayAmount = (value: string) => {
    if (!value) return '';
    const [integer, decimals] = value.split('.');
    const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${grouped}${decimals === undefined ? '' : `,${decimals}`}`;
};

export default function InternalAmountInput({ value, onChange, className }: Props) {
    const change = (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const cursor = input.selectionStart ?? input.value.length;
        let raw = input.value.replace(/[^\d,.-]/g, '');
        // Also accept a pasted/API-style decimal amount, without confusing 1.300 with 1,30.
        const nativeEvent = event.nativeEvent as InputEvent;
        const pastedOrReplaced = nativeEvent.inputType === 'insertFromPaste' || (nativeEvent.data?.length || 0) > 1;
        if (pastedOrReplaced && !raw.includes(',') && /^\d*\.\d{1,2}$/.test(raw)) raw = raw.replace('.', ',');
        raw = raw.replace(/\./g, '');
        if (!/^\d*(,\d{0,2})?$/.test(raw)) return;
        const canonical = raw.replace(',', '.').replace(/^0+(?=\d)/, '');
        const display = displayAmount(canonical);
        const meaningfulBeforeCursor = input.value.slice(0, cursor).replace(/[^\d,]/g, '').length;
        const atEnd = cursor === input.value.length;
        onChange(canonical);
        requestAnimationFrame(() => {
            if (document.activeElement !== input) return;
            let position = 0;
            let count = 0;
            while (position < display.length && count < meaningfulBeforeCursor) {
                if (/[\d,]/.test(display[position])) count++;
                position++;
            }
            input.setSelectionRange(atEnd ? display.length : position, atEnd ? display.length : position);
        });
    };

    return <input type="text" inputMode="decimal" required autoComplete="off" placeholder="Ej.: 1.300.000,50"
        pattern="[0-9]{1,3}(\.[0-9]{3})*(,[0-9]{0,2})?" title="Ingresá un importe positivo. Usá coma para los centavos."
        value={displayAmount(value)} onChange={change} className={className} />;
}
