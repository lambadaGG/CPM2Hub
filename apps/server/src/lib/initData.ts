import { createHmac, timingSafeEqual } from 'node:crypto';

export interface InitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ValidInitData {
  authDate: number;
  userId: number;
  user?: InitDataUser;
  raw: string;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export function verifyInitData(raw: string, botToken: string): ValidInitData | null {
  if (!raw || !botToken) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const pairs: Array<[string, string]> = [];
  for (const [key, value] of params.entries()) pairs.push([key, value]);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = hmac(botToken, 'WebAppData');
  const computed = hmac(secretKey, dataCheckString).toString('hex');

  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate) return null;
  if (Date.now() - authDate * 1000 > MAX_AGE_MS) return null;

  let user: InitDataUser | undefined;
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = undefined;
    }
  }

  return {
    authDate,
    userId: user?.id ?? 0,
    user,
    raw,
  };
}
