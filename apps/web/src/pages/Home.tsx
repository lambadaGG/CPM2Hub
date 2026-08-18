import { useCallback, useEffect, useState } from 'react';
import { getBuilds, getProducts, trackEvent } from '../api';
import type { Build, Product } from '../api';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { fmtCompact, fmtDateTime } from '../utils';

function BuildCard({ build, onClick }: { build: Build; onClick: () => void }) {
  return (
    <button className="build-card" onClick={onClick}>
      {build.screenshots[0] && (
        <img className="build-thumb" src={build.screenshots[0]} alt={build.title} />
      )}
      <div className="build-card-info">
        <h3 className="build-card-title">{build.title}</h3>
        <p className="build-card-car">{build.carModel}</p>
        <div className="build-card-meta">
          {build.author && (
            <span className="build-card-author">
              <Avatar className="build-card-avatar" telegramId={build.author.telegramId} name={build.author.firstName} />
              {build.author.firstName}
            </span>
          )}
          <span className="build-card-stats">
            <Icon id="i-heart" className="icon" />{fmtCompact(build.likesCount)}
            {build.ratingAvg > 0 && <><Icon id="i-star" className="icon" />{Number(build.ratingAvg).toFixed(1)}</>}
          </span>
        </div>
      </div>
    </button>
  );
}

function QuickTool({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="quick-tool" onClick={onClick}>
      <Icon id={icon} className="icon" />
      <span>{label}</span>
    </button>
  );
}

export function Home({ onOpenBuild, onOpenTool, onOpenExplore }: {
  onOpenBuild: (id: number) => void;
  onOpenTool: (tool?: string) => void;
  onOpenExplore: () => void;
}) {
  const [featured, setFeatured] = useState<Build[]>([]);
  const [trending, setTrending] = useState<Build[]>([]);
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      const [feat, trend] = await Promise.all([
        getBuilds({ featured: true }).catch(() => []),
        getBuilds().catch(() => []),
      ]);
      setFeatured(feat);
      setTrending(trend.slice(0, 10));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="screen home">
      <header className="top">
        <div>
          <h1 className="page-title">CPM2 Hub</h1>
          <div className="logo-sub">{t('home.subtitle')}</div>
        </div>
      </header>

      {featured.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">{t('home.featured')}</h2>
          <div className="featured-scroll">
            {featured.map((b) => (
              <BuildCard key={b.id} build={b} onClick={() => onOpenBuild(b.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <h2 className="section-title">{t('home.tools')}</h2>
        <div className="quick-tools">
          <QuickTool icon="i-gear" label={t('tools.gearbox')} onClick={() => onOpenTool('gearbox')} />
          <QuickTool icon="i-tools" label={t('tools.suspension')} onClick={() => onOpenTool('suspension')} />
          <QuickTool icon="i-compare" label={t('tools.compare')} onClick={() => onOpenTool('compare')} />
          <QuickTool icon="i-palette" label={t('tools.color')} onClick={() => onOpenTool('color')} />
          <QuickTool icon="i-type" label={t('tools.nick')} onClick={() => onOpenTool('nick')} />
        </div>
      </section>

      {trending.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">{t('home.trending')}</h2>
            <button className="see-all" onClick={onOpenExplore}>{t('home.seeAll')}</button>
          </div>
          <div className="trending-list">
            {trending.map((b) => (
              <BuildCard key={b.id} build={b} onClick={() => onOpenBuild(b.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
