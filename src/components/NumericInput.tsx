import React, { useState, useEffect, useLayoutEffect, useId, useRef } from "react";
import { formatNumberInput, normalizeNumberInput, formatNumber, parseNumber } from "../utils/number";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
  decimalPlaces?: 0 | 2;
}

export default function NumericInput({
  value,
  onChange,
  label,
  className = "",
  containerClassName = "",
  icon,
  style,
  decimalPlaces = 2,
  onBlur,
  ...props
}: NumericInputProps) {
  const [display, setDisplay] = useState<{ text: string; cursor: number | null }>(() => ({ text: formatNumber(value), cursor: null }));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<number | undefined>(undefined);
  const generatedId = useId();
  const inputId = props.id || generatedId;

  useEffect(() => {
    if (value !== "" && lastEmitted.current !== undefined && Number(value) === lastEmitted.current) return;
    lastEmitted.current = undefined;
    setDisplay({ text: formatNumber(value), cursor: null });
    setError("");
    inputRef.current?.setCustomValidity("");
  }, [value]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input && display.cursor !== null) {
      input.setSelectionRange(display.cursor, display.cursor);
    }
  }, [display]);

  const validate = (rawValue: string) => {
    if (rawValue === "") return { value: 0, error: "" };
    const parsed = parseNumber(decimalPlaces > 0 && rawValue.endsWith(',') ? rawValue.slice(0, -1) : rawValue, decimalPlaces);
    if (parsed.error) return parsed;
    const number = parsed.value!;
    const minimum = Number(props.min ?? 0);
    const maximum = props.max === undefined ? undefined : Number(props.max);
    if (number < minimum) return { error: `El valor mínimo es ${formatNumber(minimum)}.` };
    if (maximum !== undefined && number > maximum) return { error: `El valor máximo es ${formatNumber(maximum)}.` };
    return { value: number, error: "" };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.currentTarget.value;
    let cursor = e.currentTarget.selectionStart ?? rawValue.length;
    const { inputType, data } = e.nativeEvent as InputEvent;
    const deleting = inputType === 'deleteContentBackward' || inputType === 'deleteContentForward';
    const typing = inputType === 'insertText' && data?.length === 1;

    // Backspace/Delete next to an automatic dot removes the adjacent digit.
    if (deleting && display.text[cursor] === '.' && rawValue === display.text.slice(0, cursor) + display.text.slice(cursor + 1)) {
      const digit = inputType === 'deleteContentBackward' ? cursor - 1 : cursor;
      if (/\d/.test(rawValue[digit] || '')) {
        rawValue = rawValue.slice(0, digit) + rawValue.slice(digit + 1);
        cursor = digit;
      }
    }

    // Accept the decimal key on numeric keyboards as a comma. All other dots
    // already displayed by this field are grouping, including while regrouping.
    if (typing && data === '.') rawValue = rawValue.slice(0, cursor - 1) + ',' + rawValue.slice(cursor);
    const editingFormattedValue = /^-?(?:\d{1,3}(?:\.\d{3})*)?(?:,\d*)?$/.test(display.text);
    const normalized = (typing || deleting) && editingFormattedValue
      ? rawValue.replaceAll('.', '')
      : normalizeNumberInput(rawValue);
    const text = formatNumberInput(normalized);
    const result = validate(text);

    // Count editable characters to keep the caret beside the same digit when
    // grouping adds/removes dots, also for selection replacement and paste.
    const cursorSource = !rawValue.includes(',') && normalized.includes(',') ? rawValue.replace('.', ',') : rawValue;
    const beforeCursor = cursorSource.slice(0, cursor).replaceAll('.', '').trimStart().length;
    let position = 0;
    let count = 0;
    while (position < text.length && count < beforeCursor) {
      if (text[position] !== '.') count++;
      position++;
    }
    setDisplay({ text, cursor: cursor === rawValue.length ? text.length : position });
    const message = result.error || "";
    setError(message);
    e.currentTarget.setCustomValidity(message);
    if (!message && result.value !== undefined) {
      lastEmitted.current = result.value;
      onChange(result.value);
    }
  };

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode={props.inputMode || (decimalPlaces === 0 ? "numeric" : "decimal")}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], error ? `${inputId}-number-error` : undefined].filter(Boolean).join(' ') || undefined}
          className={`${className} ${icon ? 'pl-11' : 'px-4'}`}
          style={{ ...(icon ? { paddingLeft: "2.75rem" } : {}), ...style }}
          value={display.text}
          onChange={handleChange}
          onBlur={event => {
            const result = validate(event.currentTarget.value);
            if (!result.error && event.currentTarget.value.trim() && result.value !== undefined) setDisplay({ text: formatNumber(result.value), cursor: null });
            onBlur?.(event);
          }}
        />
      </div>
      {error && <p id={`${inputId}-number-error`} role="alert" className="mt-1 text-sm font-medium text-red-800">{error}</p>}
    </div>
  );
}
