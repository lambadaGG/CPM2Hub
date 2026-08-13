import { useEffect, useState } from 'react';
import { getDownloads, getMe } from '../api';
import type { Purchase, User } from '../api';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { fmtCompact, fmtDateTime } from '../utils';

export function Profile({ user: initial }: { user: User | null }) {
  const [me, setMe] = useState<User | null>(initial);
  const [downloads, setDownloads] = useState<Purchase[]>([]);
  const toast = useToast();

  useEffect(() => {
    getMe().then((r) => setMe(r.user)).catch(() => {});
    getDownloads().then(setDownloads).catch(() => {});
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
