import { useCallback, useEffect, useRef, useState } from "react";

export function useFormError() {
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!error) return;
    const field = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")
      || formRef.current?.querySelector<HTMLElement>("[role='alert']");
    field?.focus();
  }, [error]);
  const reportError = useCallback((cause: unknown, fallback: string) => setError(cause instanceof Error ? cause.message : fallback), []);
  return { error, setError, reportError, formRef };
}

export default function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <div role="alert" tabIndex={-1} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{message}</div>;
}
