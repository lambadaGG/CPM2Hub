import { useCallback, useEffect, useState } from 'react';
import { getCreator, getBuilds } from '../api';
import type { Build, CreatorProfile as CreatorProfileType } from '../api';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { AvatarBadge } from '../components/AvatarBadge';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact, fmtDateTime } from '../utils';

export function CreatorProfile({ creatorId, onBack, onOpenBuild }: {
  creatorId: number;
  onBack: () => void;
  onOpenBuild: (id: number) => void;
}) {
  const [creator, setCreator] = useState<CreatorProfileType | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const toast = useToast();
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([
        getCreator(creatorId),
        getBuilds({ authorId: creatorId }),
      ]);
      setCreator(c);
      setBuilds(b);
    } catch {
      toast(t('build.error'));
    }
  }, [creatorId]);

  useEffect(() => { load(); }, [load]);

  if (!creator) return <div className="screen"><div className="state-empty"><div className="spinner" /></div></div>;

  return (
    <div className="screen creator-profile">
      <header className="top">
        <button className="back-btn" onClick={onBack}>
          <Icon id="i-back" className="icon" />
        </button>
        <h1 className="page-title">{t('creator.title')}</h1>
        <div />
      </header>

      <div className="profile-hero">
        <AvatarBadge size={70} tier="free">
          <Avatar className="ab-photo" telegramId={creator.telegramId} name={creator.firstName} />
        </AvatarBadge>
        <div className="ph-info">
          <h1>{creator.firstName}</h1>
          <p>@{creator.username || '—'}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="st-label">{t('creator.builds')}</span>
          <span className="st-val">{creator.buildsCount}</span>
        </div>
        <div className="stat">
          <span className="st-label">{t('creator.likes')}</span>
          <span className="st-val">{fmtCompact(creator.likesCount)}</span>
        </div>
        <div className="stat">
          <span className="st-label">{t('creator.rating')}</span>
          <span className="st-val">{creator.ratingAvg > 0 ? creator.ratingAvg.toFixed(1) : '—'}</span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">{t('creator.buildsList')}</h2>
        {builds.length === 0 ? (
          <div className="state-empty sm">
            <Icon id="i-wrench" className="icon" />
            <p>{t('creator.noBuilds')}</p>
          </div>
        ) : (
          builds.map((b) => (
            <button key={b.id} className="build-card" onClick={() => onOpenBuild(b.id)}>
              {b.screenshots[0] && <img className="build-thumb" src={b.screenshots[0]} alt={b.title} />}
              <div className="build-card-info">
                <h3 className="build-card-title">{b.title}</h3>
                <p className="build-card-car">{b.carModel}</p>
                <div className="build-card-meta">
                  <span className="build-card-stats">
                    <Icon id="i-heart" className="icon" />{fmtCompact(b.likesCount)}
                    {b.ratingAvg > 0 && <><Icon id="i-star" className="icon" />{Number(b.ratingAvg).toFixed(1)}</>}
                  </span>
                  <span className="build-card-date">{fmtDateTime(b.createdAt)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
