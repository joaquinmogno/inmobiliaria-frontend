import { useId, useState, type ComponentProps } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  visibilityLabel?: string;
  wrapperClassName?: string;
  toggleClassName?: string;
};

export default function PasswordInput({
  id,
  className = '',
  wrapperClassName = '',
  toggleClassName = 'text-gray-600 hover:text-indigo-600',
  visibilityLabel = 'contraseña',
  disabled,
  children,
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const toggleLabel = `${visible ? 'Ocultar' : 'Mostrar'} ${visibilityLabel}`;

  return (
    <span className={`relative block ${wrapperClassName}`}>
      {children}
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible(current => !current)}
        aria-label={toggleLabel}
        aria-controls={inputId}
        title={toggleLabel}
        className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed ${toggleClassName}`}
      >
        {visible ? <EyeSlashIcon aria-hidden="true" className="h-5 w-5" /> : <EyeIcon aria-hidden="true" className="h-5 w-5" />}
      </button>
    </span>
  );
}
