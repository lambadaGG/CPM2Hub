import { randomBytes } from 'node:crypto';

export interface BuyPayload {
  productId: number;
  userId: number;
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

export async function createInvoiceLink(args: {
  title: string;
  description: string;
  payload: string;
  amountStars: number;
}): Promise<string> {
  const { getBot } = await import('../bot');
  const bot = getBot();
  return bot.api.createInvoiceLink(args.title, args.description, args.payload, '', 'XTR', [
    { label: 'Config', amount: args.amountStars },
  ]);
}
