import { useEffect, useState } from 'react';
import { getDownloads } from '../api';
import type { Product, Purchase } from '../api';
import { useI18n } from '../i18n';
import { ConfigModal } from './ConfigModal';
import { Icon } from './Icons';
import { useToast } from './Toast';

const POLL_MS = 2000;
const MAX_TRIES = 12;

export function PayConfirm({ p, known, onClose }: { p: Product; known: Set<number>; onClose: () => void }) {
  const [entry, setEntry] = useState<Purchase | null>(null);
  const { t } = useI18n();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < MAX_TRIES; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (cancelled) return;
        try {
          const dl = await getDownloads();
          const found = dl.find((d) => d.productId === p.id && d.status === 'paid' && !known.has(d.id));
          if (found) {
            if (!cancelled) setEntry(found);
            return;
          }
        } catch { /* keep polling */ }
      }
      if (!cancelled) {
        toast(t('market.confirmTimeout'));
        onClose();
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [p, known, onClose, t, toast]);

  if (entry) {
    return (
      <ConfigModal title={entry.product?.title ?? p.title} code={entry.product?.configCode ?? ''} onClose={onClose} />
    );
  }

  return (
    <div className="modal">
      <div className="modal-card pay-confirm">
        <div className="pc-head">
          <span className="pc-check"><Icon id="i-check" className="icon" /></span>
          <h3>{t('market.confirmOk')}</h3>
        </div>
        <p className="pc-title">{p.title}</p>
        <p className="pc-sub">{t('market.confirmPending')}</p>
        <div className="pc-loader" aria-hidden="true" />
      </div>
    </div>
  );
}
