import { useCallback, useEffect, useState } from 'react';
import { getBuild, toggleBuildLike, rateBuild, trackEvent } from '../api';
import type { Build } from '../api';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

const SPECS_ORDER = [
  'hp', 'torque', 'zero100', 'maxSpeed', 'gearbox', 'suspension',
  'camber', 'rideHeight', 'tires', 'engine', 'visual', 'vinyl',
] as const;

const SPEC_LABELS: Record<string, string> = {
  hp: 'HP', torque: 'Torque (Nm)', zero100: '0-100 (s)',
  maxSpeed: 'Max Speed', gearbox: 'Gearbox', suspension: 'Suspension',
  camber: 'Camber', rideHeight: 'Ride Height', tires: 'Tires',
  engine: 'Engine', visual: 'Visual', vinyl: 'Vinyl',
};

export function BuildPage({ buildId, onBack, onOpenCreator }: {
  buildId: number;
  onBack: () => void;
  onOpenCreator?: (id: number) => void;
}) {
  const [build, setBuild] = useState<Build | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      const b = await getBuild(buildId);
      setBuild(b);
      trackEvent({ type: 'build_view', buildId }).catch(() => {});
    } catch {
      toast(t('build.error'));
    }
  }, [buildId]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async () => {
    if (busy || !build) return;
    setBusy(true);
    try {
      const res = await toggleBuildLike(build.id);
      setBuild((prev) => prev ? { ...prev, liked: res.liked, likesCount: res.likesCount } : prev);
      if (res.liked) trackEvent({ type: 'build_like', buildId: build.id }).catch(() => {});
      else trackEvent({ type: 'build_unlike', buildId: build.id }).catch(() => {});
    } catch {
      toast(t('build.error'));
    } finally {
      setBusy(false);
    }
  };

  const doRate = async (value: number) => {
    if (!build) return;
    try {
      const res = await rateBuild(build.id, value);
      setBuild((prev) => prev ? {
        ...prev,
        myRating: value,
        ratingAvg: res.ratingAvg,
        ratingCount: res.ratingCount,
      } : prev);
      trackEvent({ type: 'build_rate', buildId: build.id }).catch(() => {});
    } catch {
      toast(t('build.error'));
    }
  };

  const shareToTelegram = async () => {
    if (!build) return;
    trackEvent({ type: 'share_click', buildId: build.id, source: 'build_page' }).catch(() => {});
    const botUsername = 'cpm2hub_bot';
    const deepLink = `https://t.me/${botUsername}?startapp=build_${build.id}`;
    const text = `🏁 ${build.title}\n🚗 ${build.carModel}\n❤️ ${fmtCompact(build.likesCount)} · ⭐ ${build.ratingAvg}\n\n${deepLink}`;

    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.switchInlineQuery) {
      (window as any).Telegram.WebApp.switchInlineQuery(text, ['users', 'groups', 'channels']);
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: build.title, text });
    } else {
      await navigator.clipboard?.writeText(text);
      toast(t('build.linkCopied'));
    }
  };

  if (!build) return <div className="screen"><div className="state-empty"><div className="spinner" /></div></div>;

  const specsEntries = SPECS_ORDER.filter((k) => build.specs[k] != null && build.specs[k] !== '');

  return (
    <div className="screen build-page">
      <header className="top">
        <button className="back-btn" onClick={onBack}>
          <Icon id="i-back" className="icon" />
        </button>
        <h1 className="page-title">{t('build.title')}</h1>
        <div />
      </header>

      {build.screenshots.length > 0 && (
        <div className="build-gallery">
          {build.screenshots.map((url, i) => (
            <img key={i} src={url} alt={`${build.title} ${i + 1}`} className="build-screenshot" />
          ))}
        </div>
      )}

      <div className="build-hero">
        <h2 className="build-name">{build.title}</h2>
        <p className="build-car">{build.carModel}</p>
        {build.author && (
          <button className="build-author" onClick={() => onOpenCreator?.(build.author!.id)}>
            <Avatar className="build-avatar" telegramId={build.author.telegramId} name={build.author.firstName} />
            <span>{build.author.firstName}</span>
          </button>
        )}
      </div>

      {specsEntries.length > 0 && (
        <div className="card">
          <h3 className="card-title">{t('build.specs')}</h3>
          <div className="specs-grid">
            {specsEntries.map((k) => (
              <div key={k} className="spec-item">
                <span className="spec-label">{SPEC_LABELS[k] ?? k}</span>
                <span className="spec-value">{String(build.specs[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="build-actions">
        <button
          className={`like-btn${build.liked ? ' liked' : ''}`}
          onClick={toggleLike}
          disabled={busy}
        >
          <Icon id={build.liked ? 'i-heart-filled' : 'i-heart'} className="icon" />
          {fmtCompact(build.likesCount)}
        </button>

        <div className="rating-display">
          <Icon id="i-star" className="icon" />
          <span>{build.ratingAvg > 0 ? build.ratingAvg.toFixed(1) : '—'}</span>
          <span className="rating-count">({build.ratingCount})</span>
        </div>

        <button className="share-btn" onClick={shareToTelegram}>
          <Icon id="i-share" className="icon" />
          {t('build.share')}
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">{t('build.rate')}</h3>
        <div className="rate-row">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              className={`rate-star${build.myRating === v ? ' active' : ''}`}
              onClick={() => doRate(v)}
            >
              <Icon id="i-star" className="icon" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
