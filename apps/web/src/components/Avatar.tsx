import { useState, type CSSProperties } from 'react';
import { avatarUrl } from '../api/client';

export function Avatar({ telegramId, name, className, style }: {
  telegramId?: number | null;
  name?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const [prevTelegramId, setPrevTelegramId] = useState(telegramId);

  // Adjust state during render when the telegramId prop changes, so a failed
  // avatar attempt is retried for a different user without an effect.
  if (prevTelegramId !== telegramId) {
    setPrevTelegramId(telegramId);
    setFailed(false);
  }

  const letter = (name?.trim()[0] ?? 'U').toUpperCase();
  if (!telegramId || telegramId <= 0 || failed) {
    return <div className={className} style={style}>{letter}</div>;
  }
  return (
    <img
      className={className}
      style={style}
      src={avatarUrl(telegramId)}
      alt={name ?? ''}
      onError={() => setFailed(true)}
    />
  );
}
