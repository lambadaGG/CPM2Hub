import { useEffect, useState } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk';
import { getMe, getProducts, buyProduct, payProduct } from '../api';
import type { Category, PayResponse, Product, User } from '../api';
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

function Tile({ p, balance, meId, onPaid }: { p: Product; balance: number | null; meId: number | null; onPaid: (res: PayResponse) => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useI18n();
  const isUser = p.sellerId != null;
  const mine = isUser && p.sellerId === meId;
  const canPay = balance != null && balance >= p.priceStars;
  const sellerName = p.seller?.username ? `@${p.seller.username}` : p.seller?.firstName ?? null;

  const buy = async () => {
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

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await payProduct(p.id);
      onPaid(res);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('market.notEnough'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`tile${busy ? ' busy' : ''}`}>
      <div className="tk">
        <Icon id={GLYPHS[p.glyph] ?? 'i-disc'} className="icon tk-icon" />
        {p.verified && <span className="tk-verified"><Icon id="i-check" className="icon" /></span>}
      </div>
      <div className="t-meta">
        <span className="t-badge">{p.category.toUpperCase()}</span>
        {sellerName && <span className="t-seller">{sellerName}</span>}
        <span className="t-purchases">↓ {fmtCompact(p.downloads)}</span>
      </div>
      <h3 className="t-title">{p.title}</h3>
      <p className="t-sub">{p.subtitle}</p>
      {isUser ? (
        <div className="t-buy-row">
          <button className={`t-buy pay${!canPay ? ' disabled' : ''}`} onClick={pay} disabled={busy || mine || !canPay} title={mine ? t('market.yours') : ''}>
            <span>{p.priceStars} ⭐</span>
            <span>{mine ? t('market.yours') : t('market.pay')}</span>
          </button>
          <button className="t-buy" onClick={buy} disabled={busy}>
            <span>{p.priceStars} ⭐</span>
            <span>{t('market.buy')}</span>
          </button>
        </div>
      ) : (
        <button className="t-buy" onClick={buy} disabled={busy}>
          <span>{p.priceStars} ⭐</span>
          <span>{t('market.buy')}</span>
        </button>
      )}
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

export function Market({ user, active, onOpenEscrow, onOpenSell }: { user: User | null; active: boolean; onOpenEscrow?: () => void; onOpenSell?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [balance, setBalance] = useState<number | null>(null);
  const [payRes, setPayRes] = useState<PayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const toast = useToast();

  const CATS: Array<{ value: Category | 'all'; label: string }> = [
    { value: 'all', label: t('market.all') },
    { value: 'gearbox', label: t('market.gearbox') },
    { value: 'vinyl', label: t('market.vinyl') },
    { value: 'tune', label: t('market.tune') },
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
    if (active) load();
  }, [active]);

  const filtered = cat === 'all' ? products : products.filter((p) => p.category === cat);

  const copyCode = async () => {
    if (!payRes) return;
    try {
      await navigator.clipboard.writeText(payRes.configCode);
      toast(t('market.copied'));
    } catch {
      toast(t('market.copy'));
    }
  };

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
          {onOpenSell && (
            <button className="sell-entry" onClick={onOpenSell}>
              <Icon id="i-upload" className="icon" />
              <span>{t('sell.entry')}</span>
            </button>
          )}
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
            <Tile key={p.id} p={p} balance={balance} meId={user ? user.id : null} onPaid={(res) => { setPayRes(res); load(); }} />
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

      {payRes && (
        <div className="modal" onClick={() => setPayRes(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('market.paid')}</h3>
              <button className="modal-close" onClick={() => setPayRes(null)}>×</button>
            </div>
            <div className="modal-code"><pre>{payRes.configCode}</pre></div>
            <button className="primary-btn" onClick={copyCode}>
              <Icon id="i-copy" className="icon" />
              {t('market.copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
