import React, { useState, useEffect, useId, useRef } from "react";
import { editableNumber, formatNumber, parseNumber } from "../utils/number";

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
  onFocus,
  onBlur,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatNumber(value));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const lastEmitted = useRef<number | undefined>(undefined);
  const generatedId = useId();
  const inputId = props.id || generatedId;

  useEffect(() => {
    if (value !== "" && lastEmitted.current !== undefined && Number(value) === lastEmitted.current) return;
    lastEmitted.current = undefined;
    setDisplayValue(focused.current ? editableNumber(value) : formatNumber(value));
    setError("");
    inputRef.current?.setCustomValidity("");
  }, [value]);

  const validate = (rawValue: string) => {
    if (rawValue === "") return { value: 0, error: "" };
    const parsed = parseNumber(rawValue, decimalPlaces);
    if (parsed.error) return parsed;
    const number = parsed.value!;
    const minimum = Number(props.min ?? 0);
    const maximum = props.max === undefined ? undefined : Number(props.max);
    if (number < minimum) return { error: `El valor mínimo es ${formatNumber(minimum)}.` };
    if (maximum !== undefined && number > maximum) return { error: `El valor máximo es ${formatNumber(maximum)}.` };
    return { value: number, error: "" };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Preserve separators, trailing zeroes and caret position while editing.
    setDisplayValue(rawValue);
    const result = validate(rawValue);
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
          value={displayValue}
          onChange={handleChange}
          onFocus={event => {
            focused.current = true;
            if (!error && displayValue !== "") setDisplayValue(editableNumber(value));
            onFocus?.(event);
          }}
          onBlur={event => {
            focused.current = false;
            const result = validate(event.currentTarget.value);
            if (!result.error && event.currentTarget.value.trim() && result.value !== undefined) setDisplayValue(formatNumber(result.value));
            onBlur?.(event);
          }}
        />
      </div>
      {error && <p id={`${inputId}-number-error`} role="alert" className="mt-1 text-sm font-medium text-red-800">{error}</p>}
    </div>
  );
}
