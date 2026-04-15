import React, { useState, useEffect } from "react";
import { formatNumber, parseNumber } from "../utils/number";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
}

export default function NumericInput({
  value,
  onChange,
  label,
  className = "",
  containerClassName = "",
  icon,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow empty string if user deletes everything
    if (rawValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const formatted = formatNumber(rawValue);
    const numeric = parseNumber(formatted);
    
    setDisplayValue(formatted);
    onChange(numeric);
  };

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
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
          type="text"
          className={`${className} ${icon ? 'pl-7' : 'px-4'}`}
          value={displayValue}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
