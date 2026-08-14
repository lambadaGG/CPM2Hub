import { useEffect, useState } from 'react';
import { openInvoice, openTelegramLink } from '@telegram-apps/sdk';
import { getDownloads, getMe, getTrades, topupStars } from '../api';
import type { Purchase, Trade, User } from '../api';
import { ConfigModal } from '../components/ConfigModal';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { useI18n, type Lang } from '../i18n';
import { downloadText, fmtCompact, fmtDateTime } from '../utils';

const TRADE_KIND: Record<Trade['kind'], string> = {
  money: 'escrow.kind.money',
  car: 'escrow.kind.car',
  vinyl: 'escrow.kind.vinyl',
};

const HISTORY_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'PAID', cls: 'ok' },
  pending: { label: 'PENDING', cls: 'warn' },
  waiting: { label: 'WAITING', cls: 'warn' },
  escrow: { label: 'ESCROW', cls: 'info' },
  completed: { label: 'DONE', cls: 'ok' },
};

const TOPUP_AMOUNTS = [1, 50, 100, 200, 500];

function SubCard() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const toast = useToast();
  const { t } = useI18n();
  return (
    <div className="card sub-card">
      <div className="sub-header">
        <span className="sub-badge">{t('profile.plan.free')}</span>
        <span className="sub-active">{t('profile.plan.current')}</span>
      </div>
      <div className="sub-toggle">
        <button className={`sub-toggle-btn${cycle === 'monthly' ? ' active' : ''}`} onClick={() => setCycle('monthly')}>{t('profile.plan.monthly')}</button>
        <button className={`sub-toggle-btn${cycle === 'annual' ? ' active' : ''}`} onClick={() => setCycle('annual')}>{t('profile.plan.annual')}</button>
      </div>
      <ul className="sub-benefits">
        <li>{t('profile.plan.b1')}</li>
        <li>{t('profile.plan.b2')}</li>
        <li>{t('profile.plan.b3')}</li>
      </ul>
      <button className="primary-btn wide" onClick={() => toast(t('profile.plan.soon'))}>{t('profile.plan.upgrade')}</button>
    </div>
  );
}

function TopUpCard({ onPaid }: { onPaid: () => void }) {
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await topupStars(amount);
      if (res.link) {
        try {
          const status = await openInvoice(res.link, 'url');
          if (status === 'paid') {
            toast(t('profile.topup.paid'));
            onPaid();
          } else if (status === 'pending') {
            toast(t('profile.topup.pending'));
          } else if (status === 'failed') {
            toast(t('profile.topup.failed'));
          } else {
            toast(t('profile.topup.cancelled'));
          }
        } catch {
          openTelegramLink(res.link);
          toast(t('profile.topup.invoice'));
        }
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('profile.topup.invoice'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">{t('profile.topup.title')}</h2>
      <p className="topup-sub">{t('profile.topup.sub')}</p>
      <div className="topup-amounts">
        {TOPUP_AMOUNTS.map((a) => (
          <button key={a} className={`topup-amt${a === amount ? ' active' : ''}`} onClick={() => setAmount(a)}>
            <Icon id="i-star" className="icon" />{a}
          </button>
        ))}
      </div>
      <button className="primary-btn wide" onClick={buy} disabled={busy}>
        <Icon id="i-star" className="icon" />
        {busy ? '…' : `${t('profile.topup.buy')} ${amount}`}
      </button>
    </div>
  );
}

function HistoryLog({ downloads, trades }: { downloads: Purchase[]; trades: Trade[] }) {
  const { t } = useI18n();
  const items = [
    ...downloads.map((p) => ({ id: `dl-${p.id}`, date: p.createdAt, title: p.product?.title ?? 'Item', status: p.status })),
    ...trades.map((tr) => ({ id: `tr-${tr.id}`, date: tr.createdAt, title: `${t(TRADE_KIND[tr.kind] as never)} · @${tr.peer}`, status: tr.status })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="card">
      <h2 className="card-title">{t('profile.history')}</h2>
      {items.length === 0 ? (
        <div className="state-empty sm"><Icon id="i-hourglass" className="icon" /><p>{t('profile.history.none')}</p></div>
      ) : (
        <div className="history-list">
          {items.map((i) => {
            const st = HISTORY_STATUS[i.status] ?? { label: i.status.toUpperCase(), cls: 'ok' };
            return (
              <div key={i.id} className="history-item">
                <span className="history-date">{fmtDateTime(i.date)}</span>
                <span className="history-time">{i.title}</span>
                <span className={`history-status ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LANG_LABEL: Record<Lang, string> = { ru: 'Русский', en: 'English' };

export function Profile({ user: initial, active }: { user: User | null; active?: boolean }) {
  const [me, setMe] = useState<User | null>(initial);
  const [downloads, setDownloads] = useState<Purchase[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [openItem, setOpenItem] = useState<Purchase | null>(null);
  const toast = useToast();
  const { t, lang, setLang } = useI18n();

  const load = () => {
    getMe().then((r) => setMe(r.user)).catch(() => {});
    getDownloads().then(setDownloads).catch(() => {});
    getTrades().then(setTrades).catch(() => {});
  };

  useEffect(() => {
    if (active !== false) load();
  }, [active]);

  const u = me ?? initial;

  return (
    <div className="screen profile">
      <header className="top">
        <div>
          <h1 className="page-title">{t('profile.title')}</h1>
          <div className="logo-sub">{t('profile.subtitle')}</div>
        </div>
      </header>

      <div className="profile-hero">
        <Avatar className="ph-avatar" telegramId={u?.telegramId} name={u?.firstName} />
        <div className="ph-info">
          <h1>{u ? u.firstName : 'User'}</h1>
          <p>@{u?.username || '—'} · ID {u ? String(u.telegramId).slice(0, 8) : '—'}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat"><span className="st-label">{t('profile.stars')}</span><span className="st-val">{fmtCompact(u?.creditsStars ?? 0)}</span></div>
        <div className="stat"><span className="st-label">{t('profile.tn')}</span><span className="st-val">{fmtCompact(u?.creditsTn ?? 0)}</span></div>
        <div className="stat"><span className="st-label">{t('profile.downloaded')}</span><span className="st-val">{downloads.length.toString().padStart(2, '0')}</span></div>
      </div>

      <SubCard />
      <TopUpCard onPaid={() => getMe().then((r) => setMe(r.user)).catch(() => {})} />

      <div className="card">
        <h2 className="card-title">{t('profile.downloads')}</h2>
        {downloads.length === 0 ? (
          <div className="state-empty sm"><Icon id="i-dl" className="icon" /><p>{t('profile.downloads.none')}</p></div>
        ) : (
          downloads.map((p) => (
            <div key={p.id} className="row">
              <div className="r-icon"><Icon id="i-gear" className="icon" /></div>
              <div className="r-mid">
                <span className="r-title">{p.product?.title ?? 'Item'}</span>
                <span className="r-sub">{fmtDateTime(p.createdAt)}</span>
              </div>
              {p.product?.configCode && (
                <div className="dl-acts">
                  <button className="mini-btn" onClick={() => setOpenItem(p)}>
                    <Icon id="i-eye" className="icon" />{t('profile.downloadOpen')}
                  </button>
                  <button className="mini-btn" onClick={() => { downloadText(`${p.product!.title}.txt`, p.product!.configCode); toast(t('market.downloaded')); }}>
                    <Icon id="i-dl" className="icon" />{t('profile.downloadSave')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {openItem?.product?.configCode && (
        <ConfigModal title={openItem.product.title} code={openItem.product.configCode} onClose={() => setOpenItem(null)} />
      )}

      <HistoryLog downloads={downloads} trades={trades} />

      <div className="card">
        <h2 className="card-title">{t('profile.settings')}</h2>
        <div className="settings-grid">
          <button className="set-grid-item" onClick={() => openTelegramLink('https://t.me/CPM2Hub_Support')}>
            <Icon id="i-headset" className="icon" />
            <span>{t('profile.botSupport')}</span>
          </button>
          <button className="set-grid-item" onClick={() => {
            const next: Lang = lang === 'ru' ? 'en' : 'ru';
            setLang(next);
            toast(LANG_LABEL[next]);
          }}>
            <Icon id="i-globe" className="icon" />
            <span>{t('profile.language')}: {LANG_LABEL[lang]}</span>
          </button>
          <button className="set-grid-item" onClick={() => toast(t('profile.logout'))}>
            <Icon id="i-power" className="icon" />
            <span>{t('profile.logout')}</span>
          </button>
          <button className="set-grid-item" onClick={() => toast(t('profile.changeId'))}>
            <Icon id="i-key" className="icon" />
            <span>{t('profile.changeId')}</span>
          </button>
        </div>
      </div>

      <p className="version">{t('profile.version')}</p>
    </div>
  );
}
