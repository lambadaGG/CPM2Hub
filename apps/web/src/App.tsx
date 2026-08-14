import { useState } from 'react';
import { initDataUser } from '@telegram-apps/sdk';
import type { User } from './api';
import { IconSprite } from './components/Icons';
import { TabBar, type TabId } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n';
import { Market } from './pages/Market';
import { Tools } from './pages/Tools';
import { Escrow } from './pages/Escrow';
import { Sell } from './pages/Sell';
import { Profile } from './pages/Profile';

function getUser(): User | null {
  try {
    const u = initDataUser();
    if (!u) return null;
    return {
      id: u.id ?? 0,
      telegramId: u.id ?? 0,
      username: u.username ?? null,
      firstName: u.first_name ?? '',
      creditsStars: 0,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export default function App({ isTelegramApp }: { isTelegramApp: boolean }) {
  const [tab, setTab] = useState<TabId>('market');
  const [user] = useState<User | null>(getUser);

  if (!isTelegramApp) {
    return (
      <div className="app" style={{ height: '100%', background: 'var(--bg)' }}>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--sub)' }}>
          <h2>CPM2 HUB</h2>
          <p>This application is designed for Telegram Web App.</p>
          <p>Please open this app inside the Telegram messenger.</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <I18nProvider>
        <IconSprite />
        <div className="app">
          <main className="pages">
            <div className="page" hidden={tab !== 'market'}><Market user={user} onOpenEscrow={() => setTab('escrow')} onOpenSell={() => setTab('sell')} /></div>
            <div className="page" hidden={tab !== 'tools'}><Tools /></div>
            <div className="page" hidden={tab !== 'escrow'}><Escrow /></div>
            <div className="page" hidden={tab !== 'sell'}><Sell onBack={() => setTab('market')} /></div>
            <div className="page" hidden={tab !== 'profile'}><Profile user={user} /></div>
          </main>
          <TabBar active={tab} onChange={setTab} />
        </div>
      </I18nProvider>
    </ToastProvider>
  );
}
