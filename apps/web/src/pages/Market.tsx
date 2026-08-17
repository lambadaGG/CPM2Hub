import { useCallback, useEffect, useMemo, useState } from 'react';
import { openInvoice, openTelegramLink } from '@telegram-apps/sdk';
import { getDownloads, getMe, getProducts, payProduct, rateProduct, toggleWishlist, takePreloaded } from '../api';
import { ALL_CATEGORIES, CATEGORY_META, NEW_CATEGORIES } from '../api';
import type { Category, PayResponse, Product, User } from '../api';
import { Banner } from '../components/Banner';
import { ConfigModal } from '../components/ConfigModal';
import { PayConfirm } from '../components/PayConfirm';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

async function payByInvoice(
  link: string,
  p: Product,
  onConfirmed: (known: Set<number>) => void,
  onRefetch: () => void,
  t: (k: string) => string,
  toast: (m: string) => void,
) {
  let known = new Set<number>();
  try {
    known = new Set((await getDownloads()).map((x) => x.id));
  } catch { /* ignore */ }
  let status: string;
  try {
    // Official Mini App flow: web_app_open_invoice → invoice_closed status
    status = await openInvoice(link, 'url');
  } catch {
    // Fallback for environments without openInvoice support
    openTelegramLink(link);
    toast(t('market.invoice'));
    return;
  }
  if (status === 'paid') {
    toast(t('market.invoicePaid'));
    onRefetch();
    onConfirmed(known);
  } else if (status === 'pending') {
    toast(t('market.invoicePending'));
  } else if (status === 'failed') {
    toast(t('market.invoiceFailed'));
  } else {
    toast(t('market.invoiceCancelled'));
  }
}

function productModels(p: Product): string[] {
  const out: string[] = [];
  const params = p.params ?? {};
  if (typeof params.model === 'string') out.push(params.model);
  if (typeof params.targetModel === 'string') out.push(params.targetModel);
  if (Array.isArray(params.models)) out.push(...params.models.map(String));
  if (typeof params.donorEngine === 'string') out.push(params.donorEngine);
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

function productText(p: Product): string {
  const params = p.params ?? {};
  const vals = Object.values(params).map((v) => (Array.isArray(v) ? v.join(' ') : String(v))).join(' ');
  return `${p.title} ${p.subtitle} ${vals}`.toLowerCase();
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

function Tile({ p, rank, balance, tn, meId, wishlisted, onWish, onBuy, onInvoicePaid, onOpenEscrow }: {
  p: Product;
  rank?: number;
  balance: number | null;
  tn: number | null;
  meId: number | null;
  wishlisted: boolean;
  onWish: (p: Product) => void;
  onBuy: (p: Product) => void;
  onInvoicePaid: () => void;
  onOpenEscrow?: () => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const meta = CATEGORY_META[p.category];
  const mine = p.sellerId != null && p.sellerId === meId;
  const canPay = (balance != null && balance >= p.priceStars) || (tn != null && tn >= p.priceStars);
  const rating = p.rating?.count ? p.rating : null;

  const mainAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mine) return;
    if (meta?.escrowOnly) {
      onOpenEscrow?.();
      return;
    }
    onBuy(p);
  };

  const label = mine
    ? t('market.yours')
    : meta?.escrowOnly
      ? t('market.escrowOpen')
      : canPay
        ? t('market.pay')
        : t('market.buy');

  const quickRate = async (value: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    try {
      await rateProduct(p.id, value);
      toast(`${t('market.rating')} ${value}/5`);
      onInvoicePaid(); // refetch list to update aggregates
    } catch { /* ignore */ }
  };

  return (
    <article className="tile" onClick={mainAction}>
      <div className="t-prev-wrap">
        <Preview p={p} />
        {rank != null && rank <= 3 && <span className={`t-rank t-rank-${rank}`}>#{rank}</span>}
        <button
          className={`t-wish${wishlisted ? ' on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onWish(p); }}
          aria-label="wishlist"
        >
          <Icon id="i-heart" className="icon" />
        </button>
      </div>
      <div className="t-body">
        <h3 className="t-title">{p.title}</h3>
        <p className="t-sub">{p.subtitle}</p>
        <div className="t-meta">
          {rating && rating.avg > 0 ? (
            <span className="t-rating">
              <Icon id="i-star" className="icon" />{rating.avg.toFixed(1)}
              <span className="t-rcnt">· {fmtCompact(rating.count)}</span>
            </span>
          ) : (
            <span className="t-rating dim">—</span>
          )}
          <span className="t-models">
            {productModels(p).slice(0, 2).map((m) => <em key={m}>{m}</em>)}
          </span>
        </div>
        {p.guideUrl && (
          <a className="t-guide" href={p.guideUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <Icon id="i-globe" className="icon" /> {t('market.guide')}
          </a>
        )}
        <div className="t-rater">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} className="tr-star" onClick={(e) => quickRate(v, e)} aria-label={`rate ${v}`}><Icon id="i-star" className="icon" /></button>
          ))}
        </div>
        <div className="t-foot">
          <span className="t-price">{p.priceStars} ⭐</span>
          <button
            className={`t-buy${meta?.escrowOnly ? ' warn' : ' glow'}${mine ? ' disabled' : ''}`}
            onClick={mainAction}
            disabled={mine}
          >
            {label}
          </button>
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
  const [meId, setMeId] = useState<number | null>(null);
  const [payRes, setPayRes] = useState<PayResponse | null>(null);
  const [confirm, setConfirm] = useState<{ p: Product; known: Set<number> } | null>(null);
  const [confirmBuy, setConfirmBuy] = useState<Product | null>(null);
  const [buyBusy, setBuyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [model, setModel] = useState<string | null>(null);
  const [wishes, setWishes] = useState<Set<number>>(new Set());
  const { t } = useI18n();
  const toast = useToast();

  const applyMe = useCallback((me: Awaited<ReturnType<typeof getMe>> | null) => {
    if (!me) return;
    setBalance(me.user.creditsStars);
    setTn(me.user.creditsTn);
    setMeId(me.user.id);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const pre = takePreloaded();
    if (pre.me) applyMe(pre.me);
    if (pre.products) {
      setProducts(pre.products);
      setWishes(new Set(pre.products.filter((p) => p.wishlisted).map((p) => p.id)));
    }
    try {
      const [me, prods] = await Promise.all([getMe().catch(() => null), getProducts()]);
      if (me) applyMe(me);
      setProducts(prods);
      setWishes(new Set(prods.filter((p) => p.wishlisted).map((p) => p.id)));
    } catch (e) {
      if (!pre.products) setError(e instanceof Error ? e.message : t('market.all'));
    }
  }, [t, applyMe]);

  useEffect(() => {
    if (!active) return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      getMe().then(applyMe).catch(() => {});
      getProducts().then((prods) => {
        setProducts(prods);
        setWishes(new Set(prods.filter((p) => p.wishlisted).map((p) => p.id)));
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [active, load, applyMe]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const m of productModels(p)) set.add(m);
    return [...set].sort();
  }, [products]);

  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (model && !productModels(p).includes(model)) return false;
      if (q && !productText(p).includes(q)) return false;
      return true;
    });
  }, [products, cat, search, model]);

  const shown = useMemo(() => {
    const withRating = base.filter((p) => p.rating && p.rating.count > 0);
    if (model && withRating.length > 0) {
      return [...withRating].sort((a, b) => (b.rating!.avg - a.rating!.avg) || (b.rating!.count - a.rating!.count));
    }
    return base;
  }, [base, model]);

  const starter = products.find((p) => p.category === 'bundle');

  const onWish = async (p: Product) => {
    const next = new Set(wishes);
    const turningOn = !next.has(p.id);
    if (turningOn) next.add(p.id); else next.delete(p.id);
    setWishes(next);
    try {
      await toggleWishlist(p.id);
      toast(turningOn ? t('market.wishlist.added') : t('market.wishlist.removed'));
    } catch {
      setWishes(new Set(wishes));
    }
  };

  const buy = async (p: Product) => {
    if (buyBusy) return;
    setBuyBusy(true);
    try {
      const res = await payProduct(p.id);
      if (res.link) {
        await payByInvoice(res.link, p, (known) => setConfirm({ p, known }), () => load(), t, toast);
      } else {
        setPayRes(res);
        load();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('market.notEnough'));
    } finally {
      setBuyBusy(false);
      setConfirmBuy(null);
    }
  };

  const rankOf = useMemo(() => {
    const map = new Map<number, number>();
    shown.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [shown]);

  return (
    <div className="screen market">
      <header className="top">
        <div className="user-bar">
          <Avatar className="user-avatar" telegramId={user?.telegramId} name={user?.firstName} />
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

      {starter && (
        <>
          <div className="sec-title" style={{ marginTop: 14 }}>
            <h2>{t('market.explore')}</h2>
            <span className="more">{t('market.seeAll')}</span>
          </div>
          <div className="starter">
            <div className="s-eyb">{t('market.starter.eyb')}</div>
            <h3>{starter.title}</h3>
            <div className="s-list">
              {(Array.isArray(starter.params?.contents) ? starter.params.contents : [starter.subtitle]).map((c) => (
                <span className="s-tag" key={String(c)}><Icon id="i-check" className="icon" />{String(c)}</span>
              ))}
            </div>
            <div className="s-foot">
              <div className="s-price">
                <span className="now">{starter.priceStars} ⭐</span>
                {starter.params?.discount && <span className="was">{Math.round(starter.priceStars / (1 - Number(starter.params.discount) / 100))} ⭐</span>}
              </div>
              <button className="s-cta" onClick={() => setConfirmBuy(starter)}>
                {t('market.starter.cta')}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="searchbar">
        <Icon id="i-search" className="icon" />
        <input type="text" value={search} placeholder={t('market.searchPh')} onChange={(e) => setSearch(e.target.value)} />
        <button className="model-btn" onClick={() => setModel(model ? null : models[0] ?? null)}>
          {model ?? t('market.modelAll')} <Icon id="i-cog" className="icon" />
        </button>
      </div>

      {models.length > 0 && (
        <div className="model-row">
          <button className={`m-chip${model == null ? ' active' : ''}`} onClick={() => setModel(null)}>{t('market.modelAll')}</button>
          {models.map((m) => (
            <button key={m} className={`m-chip${model === m ? ' active' : ''}`} onClick={() => setModel(model === m ? null : m)}>{m}</button>
          ))}
        </div>
      )}

      <div className="cats">
        <button key="all" className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>{t('market.all')}</button>
        {ALL_CATEGORIES.map((c) => (
          <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
            <Icon id={`i-${CATEGORY_META[c]?.glyph ?? 'disc'}`} className="icon" />
            {t(`market.${c}` as never)}
            {NEW_CATEGORIES.includes(c) && <span className="c-new">NEW</span>}
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
        <>
          {model && shown.length > 0 && (
            <div className="sec-title">
              <h2>{t('market.topRated')} · {model}</h2>
              <span className="more">{t('market.seeAll')}</span>
            </div>
          )}
          <div className="tiles">
            {shown.map((p) => (
              <Tile key={p.id} p={p} rank={model ? rankOf.get(p.id) : undefined} balance={balance} tn={tn} meId={meId} wishlisted={wishes.has(p.id)} onWish={onWish} onBuy={setConfirmBuy} onInvoicePaid={() => load()} onOpenEscrow={onOpenEscrow} />
            ))}
            {shown.length === 0 && (
              <div className="state-empty sm">
                <Icon id="i-search" className="icon" />
                <p>{t('market.all')} · 0</p>
              </div>
            )}
          </div>

          {onOpenEscrow && (
            <div className="p2p" onClick={onOpenEscrow}>
              <div className="p-eyb"><Icon id="i-shieldcheck" className="icon" />{t('market.p2p.eyb')}</div>
              <h3>{t('market.p2p.title')}</h3>
              <p>{t('market.p2p.sub')}</p>
              <div className="p-badges">
                <span className="p-badge">{t('market.p2p.fee')}</span>
                <span className="p-badge">{t('market.p2p.pro')}</span>
                <span className="p-badge">{t('market.p2p.trades')}</span>
              </div>
            </div>
          )}
        </>
      )}

      <div className="midbar">
        <div className="m-block">
          <span className="m-label">{t('market.catalog')}</span>
          <span className="m-val">{(products.length || 0).toString().padStart(2, '0')} {t('market.items')}</span>
        </div>
        <div className="m-block">
          <span className="m-label">{t('market.model')}</span>
          <span className="m-val">{models.length.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {confirmBuy && (
        <div className="modal" onClick={() => { if (!buyBusy) setConfirmBuy(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{confirmBuy.title}</h3>
              <button className="modal-close" onClick={() => setConfirmBuy(null)} disabled={buyBusy}>×</button>
            </div>
            <p className="modal-text">{t('market.confirmSub')}</p>
            <div className="bc-price">
              <span>{t('market.confirmPrice')}</span>
              <b>{confirmBuy.priceStars} ⭐</b>
            </div>
            <div className="modal-acts">
              <button className="primary-btn ghost" onClick={() => setConfirmBuy(null)} disabled={buyBusy}>
                {t('market.confirmCancel')}
              </button>
              <button className="primary-btn" onClick={() => buy(confirmBuy)} disabled={buyBusy}>
                {buyBusy ? '…' : t('market.confirmBuy')}
              </button>
            </div>
          </div>
        </div>
      )}

      {payRes && (
        <ConfigModal title={payRes.productTitle} code={payRes.configCode} onClose={() => setPayRes(null)} />
      )}

      {confirm && (
        <PayConfirm p={confirm.p} known={confirm.known} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
