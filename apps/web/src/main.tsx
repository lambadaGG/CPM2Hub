import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init, initDataRaw } from '@telegram-apps/sdk';
import App from './App';
import { setApiInitData } from './api/client';
import './styles/theme.css';

try {
  init();
} catch {
  /* non-Telegram context (dev browser) */
}

try {
  setApiInitData(initDataRaw());
} catch {
  setApiInitData(null);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
