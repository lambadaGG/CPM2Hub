import { validate } from '@telegram-apps/init-data-node';

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
  startParam?: string;
  raw: string;
}

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

export function verifyInitData(raw: string, botToken: string): ValidInitData | null {
  if (!raw || !botToken) return null;

  try {
    validate(raw, botToken, { expiresIn: MAX_AGE_SECONDS });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[initData] validation failed', {
        error: e instanceof Error ? e.message : String(e),
        rawLen: raw.length,
      });
    }
    return null;
  }

  const params = new URLSearchParams(raw);
  const authDate = Number(params.get('auth_date') ?? 0);
  const startParam = params.get('start_param') ?? undefined;

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
    startParam,
    raw,
  };
}
