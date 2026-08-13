import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icons';

export default function LoadingSplash({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setReady(true);
    }, 1200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (ready) return <>{children}</>;

  if (error) {
    return (
      <div className="screen splash-error">
        <div className="splash-content">
          <Icon id="i-power" className="icon-large" />
          <h2>Ошибка загрузки</h2>
          <p>{error}</p>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen splash">
      <div className="splash-content">
        <Icon id="i-gear" className="icon-large" />
        <h1>GearMarket</h1>
        <p>Secure P2P Marketplace</p>
        <div className="splash-spinner" />
        <p>Инициализация приложения...</p>
      </div>
    </div>
  );
}