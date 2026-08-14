export function isAdminTelegramId(telegramId: number): boolean {
  const list = process.env.ADMIN_IDS ?? '';
  return list.split(',').map((s) => s.trim()).filter(Boolean).includes(String(telegramId));
}
