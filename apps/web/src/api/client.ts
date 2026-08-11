let raw: string | null = null;

export function setApiInitData(value: string | null | undefined) {
  raw = value ?? null;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (raw) headers['X-Init-Data'] = raw;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data as { error?: string }).error) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
