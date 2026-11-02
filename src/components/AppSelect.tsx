import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { useId, type ReactNode } from 'react';

export interface AppSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  id?: string;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: ReactNode;
  className?: string;
  buttonClassName?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export default function AppSelect({
  value,
  onChange,
  options,
  id,
  name,
  ariaLabel,
  placeholder = 'Seleccionar…',
  disabled = false,
  required = false,
  icon,
  className = '',
  buttonClassName = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: AppSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const selected = options.find(option => option.value === value);
  const selectedLabel = selected?.label || placeholder;
  const accessibleLabel = ariaLabel ? `${ariaLabel}: ${selectedLabel}` : undefined;

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled} name={name}>
      <div className={`relative ${className}`}>
        <ListboxButton
          id={selectId}
          aria-label={accessibleLabel}
          aria-required={required || undefined}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={`ui-field group flex items-center gap-2 text-left ${buttonClassName}`}
        >
          {icon && <span className="shrink-0 text-indigo-500">{icon}</span>}
          <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-content-muted'}`}>
            {selectedLabel}
          </span>
          <ChevronUpDownIcon className="h-5 w-5 shrink-0 text-gray-400 transition group-data-open:rotate-180 group-data-open:text-indigo-600" aria-hidden="true" />
        </ListboxButton>

        <ListboxOptions transition
          anchor="bottom start"
          className="ui-popover z-[200] mt-1 max-h-64 w-[var(--button-width)] overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-lg outline-none [--anchor-gap:6px] data-closed:scale-95 data-closed:opacity-0"
        >
          {options.map(option => (
            <ListboxOption
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-gray-700 outline-none transition data-disabled:cursor-not-allowed data-disabled:opacity-45 data-focus:bg-indigo-50 data-focus:text-indigo-950 data-selected:bg-indigo-600 data-selected:text-white"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 group-data-selected:border-white/50 group-data-selected:bg-white/15">
                <CheckIcon className="h-3.5 w-3.5 opacity-0 group-data-selected:opacity-100" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{option.label}</span>
                {option.description && <span className="mt-0.5 block text-xs text-content-muted group-data-selected:text-indigo-100">{option.description}</span>}
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
