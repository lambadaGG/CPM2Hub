import { useEffect, useState } from 'react';
import { getTrades, createTrade } from '../api';
import type { Trade } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';

const KIND_LABELS: Record<Trade['kind'], string> = {
  car: 'Car for Car',
  money: 'Car for Money',
  vinyl: 'Vinyl Preset',
};

const STATUS_META: Record<Trade['status'], { label: string; color: string }> = {
  waiting: { label: 'Waiting for Buyer', color: '#E6B800' },
  escrow: { label: 'In Escrow', color: '#2AABEE' },
  completed: { label: 'Completed', color: '#34C759' },
};

export function Escrow() {
  const toast = useToast();
  const [kind, setKind] = useState<'money' | 'car' | 'vinyl'>('car');
  const [offer, setOffer] = useState('');
  const [receive, setReceive] = useState('');
  const [peer, setPeer] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sending, setSending] = useState(false);

  const load = () => getTrades().then(setTrades).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!offer.trim() || !receive.trim()) return toast('Fill offer and receive');
    setSending(true);
    try {
      await createTrade({ kind, offer: offer.trim(), receive: receive.trim(), peer: peer.trim() });
      toast('Trade created');
      setOffer('');
      setReceive('');
      setPeer('');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create trade');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="screen escrow">
      <header className="top">
        <div>
          <h1 className="page-title">ESCROW</h1>
          <div className="logo-sub">CPM2 WALLET</div>
        </div>
      </header>

      <div className="chip-row">
        <span className="chip">Trading available</span>
        <span className="chip">Secure payments</span>
        <span className="chip">Community vetted</span>
      </div>

      <div className="list-title"><h2>ACTIVE TRADES</h2><span className="count">{trades.length}</span></div>
      <div className="trade-cards">
        {trades.length > 0 ? (
          trades.map((t) => {
            const st = STATUS_META[t.status];
            return (
              <div key={t.id} className="trade-card">
                <span className="trade-dot" style={{ background: st.color }} />
                <span className="trade-title">
                  <strong>{KIND_LABELS[t.kind]}</strong>
                  <span className="trade-exchg">{t.offer} → {t.receive}</span>
                </span>
                <span className="trade-status" style={{ color: st.color }}>{st.label}</span>
              </div>
            );
          })
        ) : (
          <div className="state-empty sm"><Icon id="i-power" className="icon" /><p>No trades yet</p></div>
        )}
      </div>

      <button className="primary-btn wide cta-white" onClick={submit} disabled={sending}>
        <Icon id="i-shield" className="icon" />
        {sending ? 'Creating…' : 'Initiate Safe Trade'}
      </button>
    </div>
  );
}