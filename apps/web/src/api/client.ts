let raw: string | null = null;

export function setApiInitData(value: string | null | undefined) {
  raw = value ?? null;
}

const ENV_API = import.meta.env.VITE_API_URL ?? '';
const API_BASE =
  ENV_API && !/^https?:\/\//.test(ENV_API) && !ENV_API.startsWith('/')
    ? `https://${ENV_API}`
    : ENV_API || '/api';

const REQUEST_TIMEOUT_MS = 15_000;

const API_ORIGIN = API_BASE === '/api' ? '' : API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;

export function avatarUrl(telegramId: number): string {
  return `${API_ORIGIN}/avatar/${telegramId}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (raw) headers['X-Init-Data'] = raw;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data as { error?: string }).error) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  } finally {
    window.clearTimeout(timer);
  }
}
