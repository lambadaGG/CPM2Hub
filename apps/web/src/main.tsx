import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init, initDataRaw, restoreInitData } from '@telegram-apps/sdk';
import App from './App';
import { setApiInitData } from './api/client';
import './styles/theme.css';

let raw: string | null = null;
try {
  init();
  restoreInitData();
  raw = initDataRaw();
} catch {
  /* non-Telegram context (dev browser) */
}

try {
  setApiInitData(raw);
} catch {
  setApiInitData(null);
}

const isTelegramApp = !!raw;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App isTelegramApp={isTelegramApp} />
  </StrictMode>
);
