import { useEffect, useState } from 'react';
import { initDataUser } from '@telegram-apps/sdk';
import { getMe, trackEvent, type User } from './api';
import { IconSprite } from './components/Icons';
import { TabBar, type TabId } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { Tools } from './pages/Tools';
import { Escrow } from './pages/Escrow';
import { Sell } from './pages/Sell';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { BuildPage } from './pages/BuildPage';
import { Explore } from './pages/Explore';
import { CreatorProfile } from './pages/CreatorProfile';

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
      creditsTn: 0,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

function getStartParam(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const tgParam = params.get('startapp');
    if (tgParam) return tgParam;
    // Also check tgWebAppData in hash
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return hash.get('startapp');
  } catch {
    return null;
  }
}

type Overlay =
  | { kind: 'build'; buildId: number }
  | { kind: 'creator'; creatorId: number }
  | null;

export default function App({ isTelegramApp }: { isTelegramApp: boolean }) {
  const [tab, setTab] = useState<TabId>('home');
  const [user] = useState<User | null>(getUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedTool, setSelectedTool] = useState<string | undefined>();

  useEffect(() => {
    if (!isTelegramApp) return;
    getMe().then((r) => setIsAdmin(r.isAdmin)).catch(() => {});

    // Handle deep links
    const startParam = getStartParam();
    if (startParam) {
      if (startParam.startsWith('build_')) {
        const id = Number(startParam.slice(6));
        if (id) {
          setOverlay({ kind: 'build', buildId: id });
          trackEvent({ type: 'app_open', source: 'deep_link', deepLink: startParam }).catch(() => {});
        }
      } else if (startParam.startsWith('ref_')) {
        // referral — handled by auth middleware
        trackEvent({ type: 'app_open', source: 'deep_link', deepLink: startParam }).catch(() => {});
      } else if (startParam.startsWith('product_')) {
        // TODO: future — open product
        trackEvent({ type: 'app_open', source: 'deep_link', deepLink: startParam }).catch(() => {});
      } else if (startParam.startsWith('creator_')) {
        const id = Number(startParam.slice(8));
        if (id) setOverlay({ kind: 'creator', creatorId: id });
        trackEvent({ type: 'app_open', source: 'deep_link', deepLink: startParam }).catch(() => {});
      } else if (startParam.startsWith('channel_post_')) {
        // TODO: future — open channel post
        trackEvent({ type: 'app_open', source: 'deep_link', deepLink: startParam }).catch(() => {});
      } else {
        trackEvent({ type: 'app_open', source: 'direct' }).catch(() => {});
      }
    } else {
      trackEvent({ type: 'app_open', source: 'direct' }).catch(() => {});
    }
  }, [isTelegramApp]);

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

  const openBuild = (id: number) => setOverlay({ kind: 'build', buildId: id });
  const openCreator = (id: number) => setOverlay({ kind: 'creator', creatorId: id });
  const closeOverlay = () => setOverlay(null);
  const openTool = (tool?: string) => { setSelectedTool(tool); setTab('tools'); };

  return (
    <ToastProvider>
      <I18nProvider>
        <IconSprite />
        <div className="app">
          <main className="pages">
            <div className="page" hidden={tab !== 'home'}>
              <Home onOpenBuild={openBuild} onOpenTool={openTool} onOpenExplore={() => setTab('explore')} />
            </div>
            <div className="page" hidden={tab !== 'garage'}>
              <Profile user={user} active={tab === 'garage'} />
            </div>
            <div className="page" hidden={tab !== 'explore'}>
              <Explore onOpenBuild={openBuild} onOpenProduct={() => {}} onOpenSell={() => setTab('sell')} />
            </div>
            <div className="page" hidden={tab !== 'tools'}><Tools tool={selectedTool} /></div>
            <div className="page" hidden={tab !== 'profile'}>
              <Profile user={user} active={tab === 'profile'} />
            </div>
            <div className="page" hidden={tab !== 'sell'}><Sell onBack={() => setTab('home')} /></div>
            <div className="page" hidden={tab !== 'escrow'}><Escrow /></div>
            {isAdmin && <div className="page" hidden={tab !== 'admin'}><Admin /></div>}
          </main>

          {overlay?.kind === 'build' && (
            <div className="overlay">
              <BuildPage buildId={overlay.buildId} onBack={closeOverlay} onOpenCreator={openCreator} />
            </div>
          )}
          {overlay?.kind === 'creator' && (
            <div className="overlay">
              <CreatorProfile creatorId={overlay.creatorId} onBack={closeOverlay} onOpenBuild={openBuild} />
            </div>
          )}

          <TabBar active={tab} onChange={(t) => { setTab(t); setSelectedTool(undefined); }} admin={isAdmin} />
        </div>
      </I18nProvider>
    </ToastProvider>
  );
}
