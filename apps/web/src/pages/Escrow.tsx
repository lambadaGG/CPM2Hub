import { useEffect, useState } from 'react';
import { getTrades, createTrade } from '../api';
import type { Trade } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';

const DEMO = [
  { color: '#FFD60A', title: 'Waiting for Buyer', sub: '', pct: 45 },
  { color: '#2AABEE', title: 'In Escrow', sub: '', pct: 72 },
  { color: '#30D158', title: 'Completed', sub: '', pct: 100 },
];

const KIND_LABELS: Record<Trade['kind'], string> = {
  car: 'Car for Car',
  money: 'Car for Money',
  vinyl: 'Vinyl Preset',
};

const STATUS_META: Record<Trade['status'], { label: string; color: string }> = {
  waiting: { label: 'Waiting for Buyer', color: '#FFD60A' },
  escrow: { label: 'In Escrow', color: '#2AABEE' },
  completed: { label: 'Completed', color: '#30D158' },
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
          <div className="logo-sub">SAFE P2P · CPM2 WALLET GUARANTEE</div>
        </div>
      </header>

      <div className="chip-row">
        <span className="chip"><span className="ch-dot ok" />5% Fee</span>
        <span className="chip"><span className="ch-dot ok" />Bot status</span>
        <span className="chip"><Icon id="i-gauge" className="icon" />1,240+ Safe Trades</span>
      </div>

      <div className="card">
        <h2 className="card-title">Create Trade Form</h2>
        <Segmented
          options={[
            { value: 'car', label: KIND_LABELS.car },
            { value: 'money', label: KIND_LABELS.money },
            { value: 'vinyl', label: KIND_LABELS.vinyl },
          ]}
          value={kind}
          onChange={(v) => setKind(v as 'money' | 'car' | 'vinyl')}
        />
        <label className="field"><span>You Offer</span>
          <input className="text-input" placeholder="What you offer..." value={offer} onChange={(e) => setOffer(e.target.value)} /></label>
        <label className="field"><span>You Receive</span>
          <input className="text-input" placeholder="What you want..." value={receive} onChange={(e) => setReceive(e.target.value)} /></label>
        <label className="field"><span>Second Party Telegram ID</span>
          <input className="text-input" placeholder="@nickname" value={peer} onChange={(e) => setPeer(e.target.value)} /></label>
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
          DEMO.map((d) => (
            <div key={d.title} className="trade-card">
              <span className="trade-dot" style={{ background: d.color }} />
              <span className="trade-title">{d.title}</span>
              <div className="trade-bar"><div className="trade-fill" style={{ width: `${d.pct}%`, background: d.color }} /></div>
            </div>
          ))
        )}
      </div>

      <button className="primary-btn wide cta-white" onClick={submit} disabled={sending}>
        <Icon id="i-shield" className="icon" />
        {sending ? 'Creating…' : 'Initiate Safe Trade'}
      </button>
    </div>
  );
}
