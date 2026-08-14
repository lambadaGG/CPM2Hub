import { useCallback, useEffect, useState } from 'react';
import {
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

  const refund = async (id: number) => {
    try {
      await adminRefund(id);
      toast(t('admin.refunded'));
      onRefunded();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('admin.refundErr'));
    }
  };

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
                <button className="mini-btn bad" onClick={() => refund(p.id)}>{t('admin.refund')}</button>
              ) : (
                <span className="mini-tag">{p.refunded ? t('admin.refunded') : p.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
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
          <Moderation items={pending} onDone={load} />
          <Refunds items={purchases} onRefunded={load} />
        </>
      )}
    </div>
  );
}
