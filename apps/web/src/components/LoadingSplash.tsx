import { useEffect, useState, type ReactNode } from 'react';
import { preloadHome } from '../api';

const MIN_MS = 1600;
const MAX_MS = 3500;

export default function LoadingSplash({ children }: { children: ReactNode }) {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    // Remove the static boot splash injected by index.html once React is up.
    document.getElementById('boot-splash')?.remove();

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MIN_MS);
      setPct(Math.round(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let finished = false;
    let finishTimer = 0;
    let fadeTimer = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      setFading(true);
      fadeTimer = window.setTimeout(() => setGone(true), 350);
    };

    // Prefetch home data while the bar is filling; show the splash at least
    // MIN_MS so the reveal is not a jarring flash.
    preloadHome()
      .catch(() => {})
      .then(() => {
        const waited = performance.now() - start;
        finishTimer = window.setTimeout(finish, Math.max(0, MIN_MS - waited));
      });

    const maxTimer = window.setTimeout(finish, MAX_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(maxTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  if (gone) return <>{children}</>;

  return (
    <>
      {children}
      <div className={`splash-overlay${fading ? ' fade' : ''}`}>
        <div className="splash-content">
          <img
            className="splash-img"
            src={`${import.meta.env.BASE_URL}splash.png`}
            alt="CPM2Hub"
            draggable={false}
          />
          <h1 className="splash-title">CPM2Hub</h1>
          <div className="splash-bar">
            <div className="splash-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </>
  );
}
