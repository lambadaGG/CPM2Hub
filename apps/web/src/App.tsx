import { useState } from 'react';
import { initDataUser } from '@telegram-apps/sdk';
import type { User } from './api';
import { IconSprite } from './components/Icons';
import { TabBar, type TabId } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { Market } from './pages/Market';
import { Tools } from './pages/Tools';
import { Escrow } from './pages/Escrow';
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

export default function App() {
  const [tab, setTab] = useState<TabId>('market');
  const [user] = useState<User | null>(getUser);

  return (
    <ToastProvider>
      <IconSprite />
      <div className="app">
        <main className="pages">
          <div className="page" hidden={tab !== 'market'}><Market user={user} /></div>
          <div className="page" hidden={tab !== 'tools'}><Tools /></div>
          <div className="page" hidden={tab !== 'escrow'}><Escrow /></div>
          <div className="page" hidden={tab !== 'profile'}><Profile user={user} /></div>
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </ToastProvider>
  );
}
