import { and, eq } from 'drizzle-orm';
import type { TradeStatus } from '@gm/shared';
import { db } from '../db/index';
import { trades, users } from '../db/schema';

export type TradeRow = typeof trades.$inferSelect;
export type TradeAction = 'accept' | 'decline' | 'cancel' | 'complete' | 'dispute';
export type NotifyEvent = TradeAction | 'created';

const TRANSITIONS: Record<TradeAction, { role: 'creator' | 'peer' | 'any'; from: TradeStatus; to: TradeStatus }> = {
  accept: { role: 'peer', from: 'waiting', to: 'escrow' },
  decline: { role: 'peer', from: 'waiting', to: 'cancelled' },
  cancel: { role: 'creator', from: 'waiting', to: 'cancelled' },
  complete: { role: 'peer', from: 'escrow', to: 'completed' },
  dispute: { role: 'any', from: 'escrow', to: 'disputed' },
};

export const TRADE_ACTIONS = Object.keys(TRANSITIONS) as TradeAction[];

export function roleFor(trade: TradeRow, userId: number): 'creator' | 'peer' | null {
  if (trade.creatorId === userId) return 'creator';
  if (trade.peerUserId != null && trade.peerUserId === userId) return 'peer';
  return null;
}

export function canAct(trade: TradeRow, action: TradeAction, userId: number): string | null {
  const t = TRANSITIONS[action];
  const role = roleFor(trade, userId);
  if (!role) return 'not_participant';
  if (trade.status !== t.from) return 'bad_status';
  if (t.role !== 'any' && role !== t.role) return 'wrong_role';
  return null;
}

export async function actTrade(
  tradeId: number,
  action: TradeAction,
  userId: number,
): Promise<{ ok: true; trade: TradeRow } | { ok: false; error: string }> {
  const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
  if (!trade) return { ok: false, error: 'not_found' };

  const error = canAct(trade, action, userId);
  if (error) return { ok: false, error };

  const [updated] = await db
    .update(trades)
    .set({ status: TRANSITIONS[action].to, updatedAt: Date.now() })
    .where(and(eq(trades.id, tradeId), eq(trades.status, TRANSITIONS[action].from)))
    .returning();
  if (!updated) return { ok: false, error: 'bad_status' };

  await notifyTrade(updated, action, userId);
  return { ok: true, trade: updated };
}

const KIND_LABEL: Record<TradeRow['kind'], string> = {
  car: 'Car',
  money: 'Money',
  vinyl: 'Vinyl',
};

export function buildTradeMessage(trade: TradeRow): string {
  return [
    `⚖️ Escrow trade #${trade.id}`,
    `Type: ${KIND_LABEL[trade.kind]}`,
    `${trade.offer}  →  ${trade.receive}`,
    `Status: ${trade.status.toUpperCase()}`,
  ].join('\n');
}

async function userById(id: number): Promise<typeof users.$inferSelect | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

async function sendMessage(telegramId: number, text: string, replyMarkup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }): Promise<void> {
  const { getBot } = await import('../bot');
  const bot = getBot();
  await bot.api.sendMessage(telegramId, text, replyMarkup ? { reply_markup: replyMarkup } : undefined);
}

const BUTTONS: Record<NotifyEvent, { text: string; action: string }[] | null> = {
  created: [
    { text: '✅ Accept', action: 'accept' },
    { text: '❌ Decline', action: 'decline' },
  ],
  accept: null,
  decline: null,
  cancel: null,
  complete: null,
  dispute: null,
};

export async function notifyTrade(trade: TradeRow, event: NotifyEvent, actorUserId?: number): Promise<void> {
  try {
    const [creator, peer] = await Promise.all([
      userById(trade.creatorId),
      trade.peerUserId != null ? userById(trade.peerUserId) : Promise.resolve(undefined),
    ]);

    const buttons = BUTTONS[event];
    const keyboard = buttons
      ? { inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: `escrow:${b.action}:${trade.id}` }))] }
      : undefined;

    const msg = buildTradeMessage(trade);
    const heading: Record<NotifyEvent, string> = {
      created: 'You have a new escrow offer:',
      accept: 'Your escrow offer was accepted:',
      decline: 'Your escrow offer was declined:',
      cancel: 'The escrow offer was cancelled:',
      complete: 'Your escrow trade was completed:',
      dispute: 'A dispute was opened on this escrow trade:',
    };

    if (event === 'created') {
      if (peer && actorUserId !== peer.id) await sendMessage(peer.telegramId, `${heading[event]}\n${msg}`, keyboard);
    } else if (event === 'cancel') {
      if (peer && actorUserId !== peer.id) await sendMessage(peer.telegramId, `${heading[event]}\n${msg}`);
    } else {
      if (creator && actorUserId !== creator.id) await sendMessage(creator.telegramId, `${heading[event]}\n${msg}`);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[escrow] notify failed', err);
  }
}
