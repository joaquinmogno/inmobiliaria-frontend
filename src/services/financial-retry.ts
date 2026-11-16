type Pending = { key: string; body: string };
const inFlight = new Map<string, Promise<unknown>>();

function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
    return JSON.stringify(value);
}

function pendingStorageKey(endpoint: string, scope: string) {
    const identity = JSON.parse(localStorage.getItem('user') || '{}')?.id || 'session';
    return `pc-financial:${identity}:${endpoint}:${scope}`;
}

export function pendingFinancialRequest(endpoint: string, scope = 'global'): Pending | null {
    return JSON.parse(sessionStorage.getItem(pendingStorageKey(endpoint, scope)) || 'null');
}

function fingerprint(body: string) {
    const payload = JSON.parse(body);
    delete payload.expectedVersion;
    delete payload.expectedLiquidationVersion;
    return canonical(payload);
}

// Keep the original body/key across uncertain responses, including a page reload.
// A successful response releases the key so a new, identical payment remains possible.
export function withFinancialRetry<T>(endpoint: string, body: string, send: (key: string, originalBody: string) => Promise<T>): Promise<T> {
    const payload = JSON.parse(body);
    const scope = String(payload.liquidacionId || (payload.contratoId ? `contrato-${payload.contratoId}` : 'global'));
    const storageKey = pendingStorageKey(endpoint, scope);
    const pending: Pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null') || { key: crypto.randomUUID(), body };
    if (fingerprint(pending.body) !== fingerprint(body)) {
        return Promise.reject(new Error('Hay un envío anterior sin confirmar. Usá “Verificar envío pendiente” antes de registrar otro importe.'));
    }
    const active = inFlight.get(storageKey);
    if (active) return active as Promise<T>;
    // Fail before sending if durable tab storage is unavailable: never silently lose the key.
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    const promise = send(pending.key, pending.body).then(result => {
        sessionStorage.removeItem(storageKey);
        return result;
    }).catch((error: { status?: number; code?: string }) => {
        // A definitive validation/conflict response committed no operation. Network/5xx
        // responses remain uncertain; retries must use the same original request.
        // Authentication, rate limiting and proxy errors do not tell us whether
        // a prior attempt committed. Keep its key until a definitive API result.
        if (error.status && [400, 404, 409, 422].includes(error.status) && error.code
            && !['IDEMPOTENCY_KEY_REUSED', 'IDEMPOTENCY_KEY_REQUIRED'].includes(error.code)) sessionStorage.removeItem(storageKey);
        throw error;
    }).finally(() => { inFlight.delete(storageKey); });
    inFlight.set(storageKey, promise);
    return promise;
}
