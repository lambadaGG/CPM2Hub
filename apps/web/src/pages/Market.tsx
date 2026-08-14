import { useEffect, useState } from 'react';
import { openInvoice, openTelegramLink } from '@telegram-apps/sdk';
import { getMe, getProducts, payProduct } from '../api';
import { ALL_CATEGORIES, CATEGORY_META } from '../api';
import type { Category, PayResponse, Product, User } from '../api';
import { Banner } from '../components/Banner';
import { ConfigModal } from '../components/ConfigModal';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

async function openPayLink(link: string, onInvoicePaid: () => void, t: (k: string) => string, toast: (m: string) => void) {
  try {
    // Official Mini App flow: web_app_open_invoice → invoice_closed status
    const status = await openInvoice(link, 'url');
    if (status === 'paid') {
      toast(t('market.invoicePaid'));
      onInvoicePaid();
    } else if (status === 'pending') {
      toast(t('market.invoicePending'));
    } else if (status === 'failed') {
      toast(t('market.invoiceFailed'));
    } else {
      toast(t('market.invoiceCancelled'));
    }
  } catch {
    // Fallback for environments without openInvoice support
    openTelegramLink(link);
    toast(t('market.invoice'));
  }
}

function Preview({ p }: { p: Product }) {
  const { t } = useI18n();
  const meta = CATEGORY_META[p.category];
  const glyph = `i-${meta?.glyph ?? 'disc'}`;
  const mt = p.media?.type ?? 'photo';
  const hp = typeof p.params?.hp === 'number' ? p.params.hp : null;

  let zone: React.ReactNode;
  if (mt === 'before_after') {
    zone = p.media?.beforeUrl || p.media?.afterUrl ? (
      <div className="t-ba">
        {p.media?.beforeUrl && (
          <div className="t-ba-item">
            <img src={p.media.beforeUrl} alt="before" loading="lazy" />
            <span className="t-ba-tag">BEFORE</span>
          </div>
        )}
        <span className="t-ba-arrow">→</span>
        {p.media?.afterUrl && (
          <div className="t-ba-item">
            <img src={p.media.afterUrl} alt="after" loading="lazy" />
            <span className="t-ba-tag">AFTER</span>
          </div>
        )}
      </div>
    ) : (
      <Icon id={glyph} className="icon tk-icon" />
    );
  } else if (mt === 'video') {
    zone = (
      <div className="t-video">
        {p.media?.previewUrl ? (
          <img src={p.media.previewUrl} alt={p.title} loading="lazy" className="t-img" />
        ) : (
          <Icon id={glyph} className="icon tk-icon" />
        )}
        <span className="t-play-lg"><Icon id="i-power" className="icon" /></span>
        {hp != null && <span className="t-hp">{hp} {t('market.hp')}</span>}
      </div>
    );
  } else if (mt === 'audio') {
    const play = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (p.media?.audioUrl) {
        try {
          const a = new Audio(p.media.audioUrl);
          a.play().catch(() => {});
        } catch { /* ignore */ }
      }
    };
    zone = (
      <button className="t-audio" onClick={play}>
        <span className="t-play"><Icon id="i-power" className="icon" /></span>
        <span className="t-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
        <span className="t-dur">{t('market.audioNote')}</span>
      </button>
    );
  } else if (mt === 'plate') {
    const plateText = typeof p.params?.plateText === 'string' ? p.params.plateText.toUpperCase() : p.title.toUpperCase();
    zone = <span className="t-plate">{plateText}</span>;
  } else {
    zone = p.media?.previewUrl ? (
      <img src={p.media.previewUrl} alt={p.title} loading="lazy" className="t-img" />
    ) : (
      <Icon id={glyph} className="icon tk-icon" />
    );
  }

  return (
    <div className="t-prev">
      {zone}
      <span className="t-badge">{t(`market.${p.category}` as never)}</span>
      <span className="t-buys">↓ {fmtCompact(p.downloads)}</span>
      {p.verified && <span className="t-verified"><Icon id="i-check" className="icon" /></span>}
      {p.serverName && <span className="t-server"><Icon id="i-globe" className="icon" />{p.serverName}</span>}
      {meta?.escrowOnly && <span className="t-escrow">{t('market.escrowTag')}</span>}
    </div>
  );
}

function Tile({ p, balance, tn, meId, onPaid, onInvoicePaid, onOpenEscrow }: {
  p: Product;
  balance: number | null;
  tn: number | null;
  meId: number | null;
  onPaid: (res: PayResponse) => void;
  onInvoicePaid: () => void;
  onOpenEscrow?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useI18n();
  const meta = CATEGORY_META[p.category];
  const mine = p.sellerId != null && p.sellerId === meId;
  const canPay = (balance != null && balance >= p.priceStars) || (tn != null && tn >= p.priceStars);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await payProduct(p.id);
      if (res.link) {
        await openPayLink(res.link, onInvoicePaid, t, toast);
      } else {
        onPaid(res);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('market.notEnough'));
    } finally {
      setBusy(false);
    }
  };

  const mainAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mine || busy) return;
    if (meta?.escrowOnly) {
      onOpenEscrow?.();
      return;
    }
    pay();
  };

  const label = mine
    ? t('market.yours')
    : meta?.escrowOnly
      ? t('market.escrowOpen')
      : canPay
        ? t('market.pay')
        : t('market.buy');

  return (
    <article className={`tile${busy ? ' busy' : ''}`} onClick={mainAction}>
      <Preview p={p} />
      <div className="t-body">
        <h3 className="t-title">{p.title}</h3>
        <p className="t-sub">{p.subtitle}</p>
        <div className="t-foot">
          <span className="t-price">{p.priceStars} ⭐</span>
          <button
            className={`t-buy${meta?.escrowOnly ? ' warn' : ' glow'}${mine ? ' disabled' : ''}`}
            onClick={mainAction}
            disabled={busy || mine}
          >
            {label}
          </button>
        </div>
      </div>
    </article>
  );
}

function EscrowTile({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <article className="tile tile-escrow" onClick={onOpen}>
      <div className="t-prev">
        <Icon id="i-shield" className="icon tk-icon" />
        <span className="t-badge">{t('market.safe')}</span>
        <span className="t-verified"><Icon id="i-check" className="icon" /></span>
      </div>
      <div className="t-body">
        <h3 className="t-title">{t('market.escrow.title')}</h3>
        <p className="t-sub">{t('market.escrow.sub')}</p>
        <div className="t-foot">
          <span className="t-price">{t('market.escrowTag')}</span>
          <button className="t-buy warn" onClick={onOpen}>{t('market.escrow.open')}</button>
        </div>
      </div>
    </article>
  );
}

export function Market({ user, active, onOpenEscrow, onOpenSell }: { user: User | null; active: boolean; onOpenEscrow?: () => void; onOpenSell?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [balance, setBalance] = useState<number | null>(null);
  const [tn, setTn] = useState<number | null>(null);
  const [payRes, setPayRes] = useState<PayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const toast = useToast();

  const load = async () => {
    setError(null);
    try {
      const [me, prods] = await Promise.all([getMe().catch(() => null), getProducts()]);
      if (me) {
        setBalance(me.user.creditsStars);
        setTn(me.user.creditsTn);
      }
      setProducts(prods);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('market.all'));
    }
  };

  useEffect(() => {
    if (!active) return;
    load();
    const id = setInterval(() => {
      getMe().then((me) => {
        if (me) {
          setBalance(me.user.creditsStars);
          setTn(me.user.creditsTn);
        }
      }).catch(() => {});
      getProducts().then(setProducts).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [active]);

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
          <div className="user-bal tn">
            <Icon id="i-tn" className="icon" />
            <span>{tn != null ? tn : 0}</span>
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
        <button key="all" className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>{t('market.all')}</button>
        {ALL_CATEGORIES.map((c) => (
          <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
            {t(`market.${c}` as never)}
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
            <Tile key={p.id} p={p} balance={balance} tn={tn} meId={user ? user.id : null} onPaid={(res) => { setPayRes(res); load(); }} onInvoicePaid={() => load()} onOpenEscrow={onOpenEscrow} />
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
        <ConfigModal title={payRes.productTitle} code={payRes.configCode} onClose={() => setPayRes(null)} />
      )}
    </div>
  );
}
