import { useEffect, useState, type CSSProperties } from 'react';
import { avatarUrl } from '../api/client';

export function Avatar({ telegramId, name, className, style }: {
  telegramId?: number | null;
  name?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [telegramId]);

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
