export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmText?: string;
  type?: "danger" | "info";
}

let resolver: ((confirmed: boolean) => void) | null = null;

export function requestConfirmation(detail: ConfirmationRequest): Promise<boolean> {
  if (resolver) resolver(false);
  return new Promise(resolve => {
    resolver = resolve;
    window.dispatchEvent(new CustomEvent<ConfirmationRequest>("confirmation-requested", { detail }));
  });
}

export function resolveConfirmation(confirmed: boolean) {
  resolver?.(confirmed);
  resolver = null;
}
