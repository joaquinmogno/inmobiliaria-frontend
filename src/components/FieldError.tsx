import { useState, type FormEvent } from 'react';

const validationMessage = (field: HTMLInputElement | HTMLTextAreaElement) => {
  if (field.validity.valueMissing) return 'Completá este campo.';
  if (field.validity.typeMismatch) return 'Ingresá un correo electrónico válido.';
  if (field instanceof HTMLInputElement && field.validity.rangeUnderflow) return `El valor mínimo es ${field.min}.`;
  if (field instanceof HTMLInputElement && field.validity.rangeOverflow) return `El valor máximo es ${field.max}.`;
  if (field.validity.tooShort) return `Ingresá al menos ${field.minLength} caracteres.`;
  return field.title || 'Revisá el formato de este dato.';
};

export function useFieldValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = (id: string) => setErrors(current => {
    if (!current[id]) return current;
    const next = { ...current };
    delete next[id];
    return next;
  });
  const showErrors = (next: Record<string, string>) => {
    setErrors(next);
    requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus());
  };
  const ariaProps = (id: string) => ({ id, 'aria-invalid': errors[id] ? true : undefined, 'aria-describedby': errors[id] ? `${id}-error` : undefined });
  const inputProps = (id: string) => ({
    ...ariaProps(id),
    onInvalid: (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      event.preventDefault();
      const field = event.currentTarget;
      setErrors(current => ({ ...current, [id]: validationMessage(field) }));
      const firstInvalid = field.form?.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid');
      requestAnimationFrame(() => firstInvalid?.focus());
    },
    onInput: () => clear(id),
  });
  return { errors, clear, showErrors, reset: () => setErrors({}), ariaProps, inputProps };
}

export default function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-red-800">{message}</p> : null;
}
