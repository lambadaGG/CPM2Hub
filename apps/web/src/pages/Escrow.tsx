import { useEffect, useState } from 'react';
import { getTrades, createTrade } from '../api';
import type { Trade } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';

const KIND_LABELS: Record<Trade['kind'], string> = {
  car: 'escrow.kind.car',
  money: 'escrow.kind.money',
  vinyl: 'escrow.kind.vinyl',
};

const STATUS_META: Record<Trade['status'], { key: string; color: string }> = {
  waiting: { key: 'escrow.status.waiting', color: '#E6B800' },
  escrow: { key: 'escrow.status.escrow', color: '#2AABEE' },
  completed: { key: 'escrow.status.completed', color: '#34C759' },
};

export function Escrow() {
  const toast = useToast();
  const { t } = useI18n();
  const [kind, setKind] = useState<'money' | 'car' | 'vinyl'>('car');
  const [offer, setOffer] = useState('');
  const [receive, setReceive] = useState('');
  const [peer, setPeer] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sending, setSending] = useState(false);

  const load = () => getTrades().then(setTrades).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!offer.trim() || !receive.trim()) return toast(t('escrow.fill'));
    setSending(true);
    try {
      await createTrade({ kind, offer: offer.trim(), receive: receive.trim(), peer: peer.trim() });
      toast(t('escrow.created'));
      setOffer('');
      setReceive('');
      setPeer('');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('escrow.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="screen escrow">
      <header className="top">
        <div>
          <h1 className="page-title">{t('escrow.title')}</h1>
          <div className="logo-sub">{t('escrow.subtitle')}</div>
        </div>
      </header>

      <div className="chip-row">
        <span className="chip">{t('escrow.trading')}</span>
        <span className="chip">{t('escrow.secure')}</span>
        <span className="chip">{t('escrow.vetted')}</span>
      </div>

      <Segmented<'money' | 'car' | 'vinyl'>
        options={[
          { value: 'car', label: t('escrow.kind.car') },
          { value: 'money', label: t('escrow.kind.money') },
          { value: 'vinyl', label: t('escrow.kind.vinyl') },
        ]}
        value={kind}
        onChange={setKind}
      />

      <div className="trade-form">
        <input className="text-input" placeholder={t('escrow.kind.car') + ': offer'} value={offer} onChange={(e) => setOffer(e.target.value)} />
        <input className="text-input" placeholder={t('escrow.kind.money') + ': receive'} value={receive} onChange={(e) => setReceive(e.target.value)} />
        <input className="text-input" placeholder="@peer" value={peer} onChange={(e) => setPeer(e.target.value)} />
      </div>

      <div className="list-title"><h2>{t('escrow.active')}</h2><span className="count">{trades.length}</span></div>
      <div className="trade-cards">
        {trades.length > 0 ? (
          trades.map((tr) => {
            const st = STATUS_META[tr.status];
            return (
              <div key={tr.id} className="trade-card">
                <span className="trade-dot" style={{ background: st.color }} />
                <span className="trade-title">
                  <strong>{t(KIND_LABELS[tr.kind] as never)}</strong>
                  <span className="trade-exchg">{tr.offer} → {tr.receive}</span>
                </span>
                <span className="trade-status" style={{ color: st.color }}>{t(st.key as never)}</span>
              </div>
            );
          })
        ) : (
          <div className="state-empty sm"><Icon id="i-power" className="icon" /><p>{t('escrow.none')}</p></div>
        )}
      </div>

      <button className="primary-btn wide cta-white" onClick={submit} disabled={sending}>
        <Icon id="i-shield" className="icon" />
        {sending ? t('escrow.creating') : t('escrow.initiate')}
      </button>
    </div>
  );
}