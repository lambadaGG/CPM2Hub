import { useCallback, useEffect, useState } from 'react';
import { getBuilds, getProducts } from '../api';
import type { Build, Product } from '../api';
import { Icon } from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

export function Explore({ onOpenBuild, onOpenProduct, onOpenSell }: {
  onOpenBuild: (id: number) => void;
  onOpenProduct: (id: number) => void;
  onOpenSell: () => void;
}) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<'builds' | 'market'>('builds');
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([
        getBuilds().catch(() => []),
        getProducts().catch(() => []),
      ]);
      setBuilds(b);
      setProducts(p);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="screen explore">
      <header className="top">
        <div>
          <h1 className="page-title">{t('explore.title')}</h1>
          <div className="logo-sub">{t('explore.subtitle')}</div>
        </div>
      </header>

      <div className="explore-tabs">
        <button className={`exp-tab${tab === 'builds' ? ' active' : ''}`} onClick={() => setTab('builds')}>
          <Icon id="i-wrench" className="icon" />{t('explore.builds')} ({builds.length})
        </button>
        <button className={`exp-tab${tab === 'market' ? ' active' : ''}`} onClick={() => setTab('market')}>
          <Icon id="i-market" className="icon" />{t('explore.market')} ({products.length})
        </button>
      </div>

      {tab === 'builds' && (
        <div className="explore-list">
          {builds.length === 0 ? (
            <div className="state-empty"><Icon id="i-wrench" className="icon" /><p>{t('explore.noBuilds')}</p></div>
          ) : builds.map((b) => (
            <button key={b.id} className="build-card" onClick={() => onOpenBuild(b.id)}>
              {b.screenshots[0] && <img className="build-thumb" src={b.screenshots[0]} alt={b.title} />}
              <div className="build-card-info">
                <h3 className="build-card-title">{b.title}</h3>
                <p className="build-card-car">{b.carModel}</p>
                <div className="build-card-meta">
                  {b.author && (
                    <span className="build-card-author">
                      <Avatar className="build-card-avatar" telegramId={b.author.telegramId} name={b.author.firstName} />
                      {b.author.firstName}
                    </span>
                  )}
                  <span className="build-card-stats">
                    <Icon id="i-heart" className="icon" />{fmtCompact(b.likesCount)}
                    {b.ratingAvg > 0 && <><Icon id="i-star" className="icon" />{Number(b.ratingAvg).toFixed(1)}</>}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'market' && (
        <div className="explore-list">
          {products.length === 0 ? (
            <div className="state-empty"><Icon id="i-market" className="icon" /><p>{t('explore.noProducts')}</p></div>
          ) : products.map((p) => (
            <button key={p.id} className="product-card" onClick={() => onOpenProduct(p.id)}>
              <div className="r-icon"><Icon id={`i-${p.category === 'gearbox' ? 'gear' : 'disc'}`} className="icon" /></div>
              <div className="r-mid">
                <span className="r-title">{p.title}</span>
                <span className="r-sub">{p.subtitle}</span>
              </div>
              <span className="r-price">{p.priceStars}★</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
