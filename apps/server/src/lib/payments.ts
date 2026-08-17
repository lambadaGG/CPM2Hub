import { randomBytes } from 'node:crypto';

export interface BuyPayload {
  productId: number;
  userId: number;
}

export interface TopupPayload {
  userId: number;
  amountStars: number;
}

export function makeBuyPayload(productId: number, userId: number): string {
  return `buy:${productId}:${userId}:${randomBytes(4).toString('hex')}`;
}

export function parseBuyPayload(payload: string): BuyPayload | null {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'buy') return null;
  const productId = Number(parts[1]);
  const userId = Number(parts[2]);
  if (!Number.isInteger(productId) || !Number.isInteger(userId)) return null;
  return { productId, userId };
}

export function makeTopupPayload(userId: number, amountStars: number): string {
  return `topup:${userId}:${amountStars}:${randomBytes(4).toString('hex')}`;
}

export function parseTopupPayload(payload: string): TopupPayload | null {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'topup') return null;
  const userId = Number(parts[1]);
  const amountStars = Number(parts[2]);
  if (!Number.isInteger(userId) || !Number.isInteger(amountStars)) return null;
  return { userId, amountStars };
}

export async function createInvoiceLink(args: {
  title: string;
  description: string;
  payload: string;
  amountStars: number;
}): Promise<string> {
  const { getBot } = await import('../bot');
  const bot = getBot();
  // Telegram limits: title 1-32 chars, description 1-255. Our product titles
  // allow up to 40 chars, so truncate to keep createInvoiceLink from failing.
  const title = args.title.slice(0, 32);
  const description = args.description.slice(0, 255);
  return bot.api.createInvoiceLink(title, description, args.payload, '', 'XTR', [
    { label: 'Config', amount: args.amountStars },
  ]);
}
