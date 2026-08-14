import {
  ALL_CATEGORIES,
  CATEGORY_META,
  PARAM_FIELDS,
  SELL_CATEGORIES,
  type Category,
  type MediaType,
  type ModerationStatus,
  type Params,
  type SellCategory,
} from '@gm/shared';

export { SELL_CATEGORIES, ALL_CATEGORIES, CATEGORY_META, PARAM_FIELDS };

export const MIN_PRICE = 1;
export const MAX_PRICE = 1000;

const PROFANITY: string[] = [
  'бля', 'хуй', 'хуя', 'хуе', 'пизд', 'ебат', 'ёбат', 'ебал', 'сука', 'срак',
  'курв', 'пидор', 'гандон', 'говно', 'сучк', 'мраз', 'чмо', 'козл',
  'долбоеб', 'долбоёб', 'херня', 'залуп', 'шлюх', 'проститутк', 'гей',
  'bitch', 'fuck', 'shit', 'dick', 'asshole', 'whore', 'bastard',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY.some((w) => lower.includes(w));
}

const isHttpUrl = (v: unknown): boolean => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());

export function categoryLabel(c: string): string {
  return (CATEGORY_META[c as Category]?.label) ?? c;
}

export function mediaTypeFor(category: string): MediaType {
  return CATEGORY_META[category as Category]?.mediaType ?? 'photo';
}

export function riskFor(category: string): 'low' | 'medium' | 'high' {
  return CATEGORY_META[category as Category]?.risk ?? 'low';
}

interface MediaInput {
  type?: string;
  previewUrl?: unknown;
  videoUrl?: unknown;
  audioUrl?: unknown;
  beforeUrl?: unknown;
  afterUrl?: unknown;
}

export function validateMedia(category: string, media: MediaInput | null | undefined, mode: 'create' | 'patch'): { error?: string } {
  if (!media) return {};
  if (media.type !== undefined && media.type !== mediaTypeFor(category)) return { error: 'bad_media' };

  const mt = mediaTypeFor(category);
  if (mode === 'create' && mt === 'video' && !isHttpUrl(media.videoUrl)) return { error: 'bad_video' };
  if (mode === 'create' && mt === 'audio' && !isHttpUrl(media.audioUrl)) return { error: 'bad_audio' };

  for (const key of ['previewUrl', 'videoUrl', 'audioUrl', 'beforeUrl', 'afterUrl'] as const) {
    const v = media[key];
    if (v !== undefined && v !== null && v !== '' && !isHttpUrl(v)) return { error: 'bad_media' };
  }
  return {};
}

export function normalizeParams(category: string, raw: unknown): { error?: string; value?: Params } {
  if (raw === undefined || raw === null) {
    const required = PARAM_FIELDS[category as Category]?.filter((f) => f.required) ?? [];
    if (required.length > 0) return { error: 'bad_params' };
    return { value: {} };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return { error: 'bad_params' };

  const out: Params = {};
  for (const field of PARAM_FIELDS[category as Category] ?? []) {
    const v = (raw as Record<string, unknown>)[field.key];
    if (v === undefined || v === null || v === '') {
      if (field.required) return { error: 'bad_params' };
      continue;
    }
    if (field.type === 'text') {
      if (typeof v !== 'string' || v.trim().length === 0 || v.trim().length > 60) return { error: 'bad_params' };
      out[field.key] = v.trim();
    } else if (field.type === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return { error: 'bad_params' };
      out[field.key] = n;
    } else {
      const arr = typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v.map(String) : null;
      if (!arr || arr.length === 0 || arr.some((s) => s.length > 40)) return { error: 'bad_params' };
      out[field.key] = arr;
    }
  }
  return { value: out };
}

export function validateServerName(category: string, serverName: unknown): { error?: string; value?: string } {
  if (riskFor(category) !== 'high') return { value: '' };
  if (typeof serverName !== 'string' || serverName.trim().length < 2 || serverName.trim().length > 40) return { error: 'bad_server' };
  return { value: serverName.trim() };
}

export interface ListingInput {
  category?: unknown;
  title?: unknown;
  subtitle?: unknown;
  priceStars?: unknown;
  configCode?: unknown;
  media?: MediaInput;
  serverName?: unknown;
  params?: unknown;
}

export interface ListingValue {
  category: SellCategory;
  title: string;
  subtitle: string;
  priceStars: number;
  configCode: string;
  media: MediaInput;
  serverName: string;
  params: Params;
}

export function validateListing(input: ListingInput): { error?: string; value?: ListingValue } {
  const category = input.category as SellCategory;
  if (!SELL_CATEGORIES.includes(category)) return { error: 'bad_category' };

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 3 || title.length > 40) return { error: 'bad_title' };

  const subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
  if (subtitle.length > 80) return { error: 'bad_subtitle' };

  const priceStars = Number(input.priceStars);
  if (!Number.isInteger(priceStars) || priceStars < MIN_PRICE || priceStars > MAX_PRICE) return { error: 'bad_price' };

  const configCode = typeof input.configCode === 'string' ? input.configCode.trim() : '';
  if (configCode.length === 0 || configCode.length > 300) return { error: 'bad_code' };

  const media = input.media ?? {};
  const mcheck = validateMedia(category, media, 'create');
  if (mcheck.error) return { error: mcheck.error };

  const scheck = validateServerName(category, input.serverName);
  if (scheck.error) return { error: scheck.error };

  const pcheck = normalizeParams(category, input.params);
  if (pcheck.error) return { error: pcheck.error };

  return {
    value: {
      category,
      title,
      subtitle,
      priceStars,
      configCode,
      media,
      serverName: scheck.value ?? '',
      params: pcheck.value ?? {},
    },
  };
}

export function validatePatch(input: Record<string, unknown>): { error?: string; category?: SellCategory } {
  const category = input.category as SellCategory;
  if (category !== undefined && !SELL_CATEGORIES.includes(category)) return { error: 'bad_category' };
  const cat = (category ?? 'gearbox') as SellCategory;

  if (input.title !== undefined) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (title.length < 3 || title.length > 40) return { error: 'bad_title' };
  }
  if (input.subtitle !== undefined) {
    const subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
    if (subtitle.length > 80) return { error: 'bad_subtitle' };
  }
  if (input.priceStars !== undefined) {
    const priceStars = Number(input.priceStars);
    if (!Number.isInteger(priceStars) || priceStars < MIN_PRICE || priceStars > MAX_PRICE) return { error: 'bad_price' };
  }
  if (input.configCode !== undefined) {
    const configCode = typeof input.configCode === 'string' ? input.configCode.trim() : '';
    if (configCode.length === 0 || configCode.length > 300) return { error: 'bad_code' };
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') return { error: 'bad_active' };

  const mcheck = validateMedia(cat, (input.media as MediaInput | undefined) ?? null, 'patch');
  if (mcheck.error) return { error: mcheck.error };

  const scheck = validateServerName(cat, input.serverName);
  if (scheck.error) return { error: scheck.error };

  const pcheck = normalizeParams(cat, input.params);
  if (pcheck.error) return { error: 'bad_params' };

  return { category: cat };
}

export function computeModeration(category: string, params: Params): ModerationStatus {
  const meta = CATEGORY_META[category as Category];
  if (!meta || !meta.requiresModeration) return 'approved';
  if (category === 'plates') {
    const text = typeof params.plateText === 'string' ? params.plateText : '';
    return containsProfanity(text) ? 'rejected' : 'approved';
  }
  return 'pending';
}
