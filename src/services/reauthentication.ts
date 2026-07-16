let pending: ((password: string | null) => void) | null = null;

export const requestReauthentication = () => new Promise<string | null>(resolve => {
  if (pending) return resolve(null);
  pending = resolve;
  window.dispatchEvent(new Event("reauthentication-required"));
});

export const resolveReauthentication = (password: string | null) => {
  pending?.(password);
  pending = null;
};
