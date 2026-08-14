import { useCallback, useEffect, useState } from 'react';
import {
  adminGrant,
  adminModerate,
  adminRefund,
  getAdminPending,
  getAdminPurchases,
  getAdminStars,
  type AdminPurchase,
  type AdminStarsStats,
} from '../api';
import type { Product } from '../api';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact, fmtDateTime } from '../utils';

function Stats({ stats }: { stats: AdminStarsStats | null }) {
  const { t } = useI18n();
  if (!stats) return null;
  return (
    <div className="card">
      <h2 className="card-title">{t('admin.stats')}</h2>
      <div className="admin-grid">
        <div className="admin-stat"><span className="st-label">{t('admin.balance')}</span><span className="st-val">{fmtCompact(stats.bot.balance)} ⭐</span></div>
        <div className="admin-stat"><span className="st-label">{t('admin.revenue')}</span><span className="st-val">{fmtCompact(stats.bot.revenue)} ⭐</span></div>
        <div className="admin-stat"><span className="st-label">{t('admin.sales')}</span><span className="st-val">{fmtCompact(stats.platform.totalSalesStars)} ⭐</span></div>
        <div className="admin-stat"><span className="st-label">{t('admin.live')}</span><span className="st-val">{stats.platform.liveProducts}</span></div>
        <div className="admin-stat"><span className="st-label">{t('admin.pendingBuys')}</span><span className="st-val">{stats.platform.pendingBuys}</span></div>
        <div className="admin-stat"><span className="st-label">{t('admin.pendingTopups')}</span><span className="st-val">{stats.platform.pendingTopups}</span></div>
      </div>
    </div>
  );
}

function Moderation({ items, onDone }: { items: Product[]; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();

  const act = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await adminModerate(id, status);
      toast(status === 'approved' ? t('admin.approved') : t('admin.rejected'));
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('admin.err'));
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">{t('admin.moderation')}</h2>
      {items.length === 0 ? (
        <div className="state-empty sm"><Icon id="i-check" className="icon" /><p>{t('admin.none')}</p></div>
      ) : (
        <div className="admin-list">
          {items.map((p) => (
            <div key={p.id} className="admin-item">
              <div className="r-mid">
                <span className="r-title">{p.title}</span>
                <span className="r-sub">{p.category} · {p.priceStars} ⭐ · #{p.id}</span>
              </div>
              <div className="admin-acts">
                <button className="mini-btn ok" onClick={() => act(p.id, 'approved')}><Icon id="i-check" className="icon" />{t('admin.approve')}</button>
                <button className="mini-btn bad" onClick={() => act(p.id, 'rejected')}>{t('admin.reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Refunds({ items, onRefunded }: { items: AdminPurchase[]; onRefunded: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refund = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await adminRefund(id);
      toast(t('admin.refunded'));
      onRefunded();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('admin.refundErr'));
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  };

  const target = items.find((p) => p.id === confirmId) ?? null;

  return (
    <div className="card">
      <h2 className="card-title">{t('admin.refunds')}</h2>
      {items.length === 0 ? (
        <div className="state-empty sm"><Icon id="i-hourglass" className="icon" /><p>{t('admin.noRefunds')}</p></div>
      ) : (
        <div className="admin-list">
          {items.map((p) => (
            <div key={p.id} className="admin-item">
              <div className="r-mid">
                <span className="r-title">{p.productTitle}</span>
                <span className="r-sub">
                  {p.buyer.username ? `@${p.buyer.username}` : p.buyer.firstName} · {fmtDateTime(p.createdAt)} · {p.amountStars} ⭐
                </span>
              </div>
              {p.status === 'paid' && !p.refunded ? (
                <button className="mini-btn bad" disabled={busy} onClick={() => setConfirmId(p.id)}>{t('admin.refund')}</button>
              ) : (
                <span className="mini-tag">{p.refunded ? t('admin.refunded') : p.status}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {target && (
        <div className="modal" onClick={() => !busy && setConfirmId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('admin.refundConfirmTitle')}</h3>
              <button className="modal-close" disabled={busy} onClick={() => setConfirmId(null)}>×</button>
            </div>
            <p className="modal-text">{t('admin.refundConfirmText')}</p>
            <div className="r-mid" style={{ marginBottom: 12 }}>
              <span className="r-title">{target.productTitle}</span>
              <span className="r-sub">{target.amountStars} ⭐ · {target.buyer.username ? `@${target.buyer.username}` : target.buyer.firstName}</span>
            </div>
            <div className="modal-acts">
              <button className="mini-btn" disabled={busy} onClick={() => setConfirmId(null)}>{t('admin.refundCancel')}</button>
              <button className="mini-btn bad" disabled={busy} onClick={() => refund(target.id)}>{busy ? '…' : t('admin.refund')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Grant() {
  const { t } = useI18n();
  const toast = useToast();
  const [telegramId, setTelegramId] = useState('');
  const [stars, setStars] = useState('');
  const [tn, setTn] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const id = Number(telegramId);
    if (!Number.isInteger(id) || id <= 0) return toast(t('admin.grantErr'));
    setBusy(true);
    try {
      const credits: { stars?: number; tn?: number } = {};
      const s = Number(stars);
      const tnV = Number(tn);
      if (Number.isInteger(s) && s !== 0) credits.stars = s;
      if (Number.isInteger(tnV) && tnV !== 0) credits.tn = tnV;
      if (Object.keys(credits).length === 0) return toast(t('admin.grantErr'));
      const res = await adminGrant(id, credits);
      toast(`${t('admin.granted')} ID ${res.telegramId}: ⭐${res.creditsStars} / ТН${res.creditsTn}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('admin.err'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">{t('admin.grant')}</h2>
      <div className="grant-row">
        <input className="field" placeholder="Telegram ID" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} inputMode="numeric" />
        <input className="field" placeholder={`⭐ ${t('admin.grantStars')}`} value={stars} onChange={(e) => setStars(e.target.value)} inputMode="numeric" />
        <input className="field" placeholder={`ТН ${t('admin.grantStars')}`} value={tn} onChange={(e) => setTn(e.target.value)} inputMode="numeric" />
        <button className="mini-btn ok" disabled={busy} onClick={submit}>{t('admin.grantBtn')}</button>
      </div>
    </div>
  );
}

export function Admin() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminStarsStats | null>(null);
  const [pending, setPending] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, b] = await Promise.all([getAdminStars(), getAdminPending(), getAdminPurchases(50)]);
      setStats(s);
      setPending(p);
      setPurchases(b);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('admin.err'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="screen admin">
      <header className="top">
        <div>
          <h1 className="page-title">{t('admin.title')}</h1>
          <div className="logo-sub">{t('admin.subtitle')}</div>
        </div>
      </header>

      {err ? (
        <div className="state-empty"><Icon id="i-gear" className="icon" /><p>{err}</p><button className="primary-btn" style={{ marginTop: 10 }} onClick={load}>{t('market.retry')}</button></div>
      ) : (
        <>
          <Stats stats={stats} />
          <Grant />
          <Moderation items={pending} onDone={load} />
          <Refunds items={purchases} onRefunded={load} />
        </>
      )}
    </div>
  );
}
