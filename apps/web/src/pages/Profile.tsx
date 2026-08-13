import { useEffect, useState } from 'react';
import { getDownloads, getMe, getTrades } from '../api';
import type { Purchase, Trade, User } from '../api';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { fmtCompact, fmtDateTime } from '../utils';

const TRADE_KIND: Record<Trade['kind'], string> = {
  money: 'Car for Money',
  car: 'Car for Car',
  vinyl: 'Vinyl Preset',
};

const HISTORY_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'PAID', cls: 'ok' },
  pending: { label: 'PENDING', cls: 'warn' },
  waiting: { label: 'WAITING', cls: 'warn' },
  escrow: { label: 'ESCROW', cls: 'info' },
  completed: { label: 'DONE', cls: 'ok' },
};

function SubCard() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const toast = useToast();
  return (
    <div className="card sub-card">
      <div className="sub-header">
        <span className="sub-badge">FREE</span>
        <span className="sub-active">Current plan</span>
      </div>
      <div className="sub-toggle">
        <button className={`sub-toggle-btn${cycle === 'monthly' ? ' active' : ''}`} onClick={() => setCycle('monthly')}>Monthly</button>
        <button className={`sub-toggle-btn${cycle === 'annual' ? ' active' : ''}`} onClick={() => setCycle('annual')}>Annual</button>
      </div>
      <ul className="sub-benefits">
        <li>+ Unlimited downloads</li>
        <li>+ Exclusive gearbox presets</li>
        <li>+ Priority bot support</li>
      </ul>
      <button className="primary-btn wide" onClick={() => toast('Upgrade coming soon')}>Upgrade to PRO</button>
    </div>
  );
}

function HistoryLog({ downloads, trades }: { downloads: Purchase[]; trades: Trade[] }) {
  const items = [
    ...downloads.map((p) => ({ id: `dl-${p.id}`, date: p.createdAt, title: p.product?.title ?? 'Item', status: p.status })),
    ...trades.map((t) => ({ id: `tr-${t.id}`, date: t.createdAt, title: `${TRADE_KIND[t.kind]} · @${t.peer}`, status: t.status })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="card">
      <h2 className="card-title">History Log</h2>
      {items.length === 0 ? (
        <div className="state-empty sm"><Icon id="i-hourglass" className="icon" /><p>No operations yet</p></div>
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

export function Profile({ user: initial }: { user: User | null }) {
  const [me, setMe] = useState<User | null>(initial);
  const [downloads, setDownloads] = useState<Purchase[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const toast = useToast();

  useEffect(() => {
    getMe().then((r) => setMe(r.user)).catch(() => {});
    getDownloads().then(setDownloads).catch(() => {});
    getTrades().then(setTrades).catch(() => {});
  }, []);

  const u = me ?? initial;

  return (
    <div className="screen profile">
      <header className="top">
        <div>
          <h1 className="page-title">PROFILE</h1>
          <div className="logo-sub">ACCOUNT · SETTINGS</div>
        </div>
      </header>

      <div className="profile-hero">
        <div className="ph-avatar">{u ? (u.firstName || 'U')[0] : 'U'}</div>
        <div className="ph-info">
          <h1>{u ? u.firstName : 'User'}</h1>
          <p>@{u?.username || '—'} · ID {u ? String(u.telegramId).slice(0, 8) : '—'}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat"><span className="st-label">STARS</span><span className="st-val">{fmtCompact(u?.creditsStars ?? 0)}</span></div>
        <div className="stat"><span className="st-label">DOWNLOADED</span><span className="st-val">{downloads.length.toString().padStart(2, '0')}</span></div>
      </div>

      <SubCard />

      <div className="card">
        <h2 className="card-title">My Downloads</h2>
        {downloads.length === 0 ? (
          <div className="state-empty sm"><Icon id="i-dl" className="icon" /><p>Nothing downloaded yet</p></div>
        ) : (
          downloads.map((p) => (
            <div key={p.id} className="row">
              <div className="r-icon"><Icon id="i-gear" className="icon" /></div>
              <div className="r-mid">
                <span className="r-title">{p.product?.title ?? 'Item'}</span>
                <span className="r-sub">{fmtDateTime(p.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <HistoryLog downloads={downloads} trades={trades} />

      <div className="card">
        <h2 className="card-title">Settings & Support</h2>
        <div className="settings-grid">
          <button className="set-grid-item" onClick={() => toast('Bot support')}>
            <Icon id="i-headset" className="icon" />
            <span>Bot support</span>
          </button>
          <button className="set-grid-item" onClick={() => toast('Language')}>
            <Icon id="i-globe" className="icon" />
            <span>Language</span>
          </button>
          <button className="set-grid-item" onClick={() => toast('Logout')}>
            <Icon id="i-power" className="icon" />
            <span>Logout</span>
          </button>
          <button className="set-grid-item" onClick={() => toast('Change ID')}>
            <Icon id="i-key" className="icon" />
            <span>Change ID</span>
          </button>
        </div>
      </div>

      <p className="version">CPM2 HUB v0.1.0</p>
    </div>
  );
}
