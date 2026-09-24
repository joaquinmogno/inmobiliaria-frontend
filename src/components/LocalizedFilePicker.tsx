import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { useRef } from 'react';

interface LocalizedFilePickerProps {
  id: string;
  label: string;
  accept: string;
  formatsLabel: string;
  selectedFiles: File[];
  onFilesSelected: (files: File[]) => void;
  validateFile?: (file: File) => string | null;
  onValidationError?: (message: string) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
};

export default function LocalizedFilePicker({
  id,
  label,
  accept,
  formatsLabel,
  selectedFiles,
  onFilesSelected,
  validateFile,
  onValidationError,
  multiple = false,
  required = false,
  disabled = false,
  className = '',
}: LocalizedFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = `${id}-description`;

  const processFiles = (files: File[]) => {
    const normalizedFiles = multiple ? files : files.slice(0, 1);
    const validationError = validateFile
      ? normalizedFiles.map(file => validateFile(file)).find(Boolean)
      : null;

    if (validationError) {
      if (inputRef.current) inputRef.current.value = '';
      onValidationError?.(validationError);
      return null;
    }
    onFilesSelected(normalizedFiles);
    return normalizedFiles;
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-gray-800">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <div
        className="relative flex min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-200"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          if (disabled) return;
          const processedFiles = processFiles(Array.from(event.dataTransfer.files));
          if (processedFiles && inputRef.current) {
            const transfer = new DataTransfer();
            processedFiles.forEach(file => transfer.items.add(file));
            inputRef.current.files = transfer.files;
          }
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={event => processFiles(Array.from(event.target.files || []))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <DocumentArrowUpIcon className="h-8 w-8 text-indigo-700" aria-hidden="true" />
        <span className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-800">
          {multiple ? 'Elegir archivos' : 'Elegir archivo'}
        </span>
        <span className="mt-2 max-w-full truncate text-sm font-medium text-gray-700">
          {selectedFiles.length === 0
            ? 'Ningún archivo seleccionado'
            : selectedFiles.length === 1
              ? `${selectedFiles[0].name} · ${formatFileSize(selectedFiles[0].size)}`
              : `${selectedFiles.length} archivos seleccionados`}
        </span>
        <span id={descriptionId} className="mt-1 text-xs text-gray-600">
          Formatos permitidos: {formatsLabel}. Tamaño máximo: 30 MB por archivo.
        </span>
      </div>
    </div>
  );
}
