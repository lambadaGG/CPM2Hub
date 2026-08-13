import { useEffect, useState } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk';
import { getMe, getProducts, buyProduct } from '../api';
import type { Category, Product, User } from '../api';
import { Banner } from '../components/Banner';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

const GLYPHS: Record<string, string> = {
  gear: 'i-gear',
  gauge: 'i-gauge',
  key: 'i-key',
  drop: 'i-dropper',
  disc: 'i-disc',
  type: 'i-type',
  shield: 'i-shieldcheck',
};

const USD_RATE = 50; // 1 Star ≈ $0.02

function Tile({ p }: { p: Product }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  const click = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await buyProduct({ productId: p.id });
      if (res.link) {
        openTelegramLink(res.link);
        toast(t('market.invoice'));
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('market.invoice'));
    } finally {
      setBusy(false);
    }
  };

  const usdPrice = (p.priceStars / USD_RATE).toFixed(2);

  return (
    <article className={`tile${busy ? ' busy' : ''}`}>
      <div className="tk">
        <Icon id={GLYPHS[p.glyph] ?? 'i-disc'} className="icon tk-icon" />
        {p.verified && <span className="tk-verified"><Icon id="i-check" className="icon" /></span>}
      </div>
      <div className="t-meta">
        <span className="t-badge">{p.category.toUpperCase()}</span>
        <span className="t-purchases">↓ {fmtCompact(p.downloads)}</span>
      </div>
      <h3 className="t-title">{p.title}</h3>
      <p className="t-sub">{p.subtitle}</p>
      <button className="t-buy" onClick={click} disabled={busy}>
        <span>{p.priceStars} Stars (${usdPrice})</span>
        <span>{t('market.buy')}</span>
      </button>
    </article>
  );
}

function EscrowTile({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <article className="tile tile-escrow" onClick={onOpen}>
      <div className="tk">
        <Icon id="i-shield" className="icon tk-icon" />
        <span className="tk-verified"><Icon id="i-check" className="icon" /></span>
      </div>
      <div className="t-meta">
        <span className="t-badge">{t('market.safe')}</span>
        <span className="t-purchases">{t('market.escrowTag')}</span>
      </div>
      <h3 className="t-title">{t('market.escrow.title')}</h3>
      <p className="t-sub">{t('market.escrow.sub')}</p>
      <button className="t-buy" onClick={onOpen}>
        <span>{t('market.escrow.buy')}</span>
        <span>{t('market.escrow.open')}</span>
      </button>
    </article>
  );
}

export function Market({ user, onOpenEscrow }: { user: User | null; onOpenEscrow?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const CATS: Array<{ value: Category | 'all'; label: string }> = [
    { value: 'all', label: t('market.all') },
    { value: 'gearbox', label: t('market.gearbox') },
    { value: 'vinyl', label: t('market.vinyl') },
  ];

  const load = async () => {
    setError(null);
    try {
      const [me, prods] = await Promise.all([getMe().catch(() => null), getProducts()]);
      if (me) setBalance(me.user.creditsStars);
      setProducts(prods);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('market.all'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = cat === 'all' ? products : products.filter((p) => p.category === cat);

  return (
    <div className="screen market">
      <header className="top">
        <div className="user-bar">
          <div className="user-avatar">{user ? (user.firstName || 'U')[0] : 'U'}</div>
          <div className="user-info">
            <span className="user-name">{user ? user.firstName : 'User'}</span>
            <span className="user-id">ID: {user ? String(user.telegramId).slice(0, 8) : '—'}</span>
          </div>
          <div className="user-bal">
            <Icon id="i-star" className="icon" />
            <span>{balance != null ? balance : 0}</span>
          </div>
        </div>
      </header>

      <Banner />

      <div className="cats">
        {CATS.map((c) => (
          <button key={c.value} className={cat === c.value ? 'active' : ''} onClick={() => setCat(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="state-empty">
          <Icon id="i-power" className="icon" />
          <p>{error}</p>
          <button className="primary-btn" style={{ marginTop: 10 }} onClick={load}>
            {t('market.retry')}
          </button>
        </div>
      ) : (
        <div className="tiles">
          {filtered.map((p) => (
            <Tile key={p.id} p={p} />
          ))}
          {onOpenEscrow && <EscrowTile onOpen={onOpenEscrow} />}
        </div>
      )}

      <div className="midbar">
        <div className="m-block">
          <span className="m-label">{t('market.catalog')}</span>
          <span className="m-val">{(products.length || 0).toString().padStart(2, '0')} {t('market.items')}</span>
        </div>
      </div>
    </div>
  );
}
