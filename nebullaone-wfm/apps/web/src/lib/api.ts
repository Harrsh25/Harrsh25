/** Thin fetch wrapper: adds the session token, turns API errors into ApiError. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
  }
  get blocking(): string[] { return this.details?.blocking ?? []; }
  get warnings(): string[] { return this.details?.warnings ?? []; }
  get canOverride(): boolean { return !!this.details?.canOverride; }
}

const TOKEN_KEY = 'nebulla-token';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized();
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }
  return data as T;
}
