import type { CSSProperties, ReactNode } from 'react';

const TIER_RING: Record<string, { c1: string; c2: string }> = {
  free: { c1: '#60a5fa', c2: '#a78bfa' },
  pro: { c1: '#22d3ee', c2: '#38bdf8' },
  gold: { c1: '#f5b301', c2: '#fde68a' },
};

export function AvatarBadge({
  tier = 'free',
  size = 70,
  children,
}: {
  tier?: 'free' | 'pro' | 'gold' | string;
  size?: number;
  children: ReactNode;
}) {
  const g = TIER_RING[tier] ?? TIER_RING.free;
  return (
    <div
      className="avatar-ring"
      style={{ '--ring-c1': g.c1, '--ring-c2': g.c2, width: size, height: size } as CSSProperties}
    >
      {children}
    </div>
  );
}
