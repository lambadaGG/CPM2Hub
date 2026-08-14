import { useEffect, useState } from 'react';
import { getTrades, createTrade, tradeAction } from '../api';
import type { Trade, TradeStatus } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { useI18n, type TKey } from '../i18n';

const KIND_LABELS: Record<Trade['kind'], TKey> = {
  car: 'escrow.kind.car',
  money: 'escrow.kind.money',
  vinyl: 'escrow.kind.vinyl',
};

const STATUS_META: Record<TradeStatus, { key: TKey; color: string }> = {
  waiting: { key: 'escrow.status.waiting', color: '#E6B800' },
  escrow: { key: 'escrow.status.escrow', color: '#2AABEE' },
  completed: { key: 'escrow.status.completed', color: '#34C759' },
  cancelled: { key: 'escrow.status.cancelled', color: '#8E8E93' },
  disputed: { key: 'escrow.status.disputed', color: '#FF453A' },
};

const ACTION_TOAST: Record<string, TKey> = {
  accept: 'escrow.accepted',
  decline: 'escrow.declined',
  complete: 'escrow.completed',
  cancel: 'escrow.cancelled',
  dispute: 'escrow.disputed',
};

function TradeActions({ tr, onDone }: { tr: Trade; onDone: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const buttons: Array<{ action: 'accept' | 'decline' | 'cancel' | 'complete' | 'dispute'; key: TKey; cls: string }> = [];
  if (tr.role === 'creator' && tr.status === 'waiting') buttons.push({ action: 'cancel', key: 'escrow.cancel', cls: 'danger' });
  if (tr.role === 'peer' && tr.status === 'waiting') {
    buttons.push({ action: 'accept', key: 'escrow.accept', cls: 'ok' });
    buttons.push({ action: 'decline', key: 'escrow.decline', cls: 'danger' });
  }
  if (tr.role === 'peer' && tr.status === 'escrow') {
    buttons.push({ action: 'complete', key: 'escrow.complete', cls: 'good' });
    buttons.push({ action: 'dispute', key: 'escrow.dispute', cls: 'warn' });
  }
  if (tr.role === 'creator' && tr.status === 'escrow') buttons.push({ action: 'dispute', key: 'escrow.dispute', cls: 'warn' });

  if (buttons.length === 0) return null;

  const run = async (action: (typeof buttons)[number]['action']) => {
    if (busy) return;
    setBusy(true);
    try {
      await tradeAction(tr.id, action);
      toast(t(ACTION_TOAST[action]));
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('escrow.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="trade-actions">
      {buttons.map((b) => (
        <button key={b.action} className={`trade-action-btn ${b.cls}`} onClick={() => run(b.action)} disabled={busy}>
          {t(b.key)}
        </button>
      ))}
    </div>
  );
}

export function Escrow() {
  const toast = useToast();
  const { t } = useI18n();
  const [view, setView] = useState<'mine' | 'incoming'>('mine');
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
    if (!peer.trim()) return toast(t('escrow.needPeer'));
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

  const filtered = view === 'incoming' ? trades.filter((tr) => tr.role === 'peer') : trades.filter((tr) => tr.role === 'creator');

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
        <input className="text-input" placeholder={`${t(KIND_LABELS[kind])} · ${t('escrow.offerPh')}`} value={offer} onChange={(e) => setOffer(e.target.value)} />
        <input className="text-input" placeholder={`${t(KIND_LABELS[kind])} · ${t('escrow.receivePh')}`} value={receive} onChange={(e) => setReceive(e.target.value)} />
        <input className="text-input" placeholder={t('escrow.peerPlaceholder')} value={peer} onChange={(e) => setPeer(e.target.value)} />
      </div>

      <Segmented<'mine' | 'incoming'>
        options={[
          { value: 'mine', label: t('escrow.mine') },
          { value: 'incoming', label: t('escrow.incoming') },
        ]}
        value={view}
        onChange={setView}
      />

      <div className="list-title"><h2>{view === 'incoming' ? t('escrow.incoming') : t('escrow.mine')}</h2><span className="count">{filtered.length}</span></div>
      <div className="trade-cards">
        {filtered.length > 0 ? (
          filtered.map((tr) => {
            const st = STATUS_META[tr.status];
            return (
              <div key={tr.id} className="trade-card">
                <div className="trade-row">
                  <span className="trade-dot" style={{ background: st.color }} />
                  <span className="trade-title">
                    <strong>{t(KIND_LABELS[tr.kind])}</strong>
                    <span className="trade-exchg">{tr.offer} → {tr.receive}</span>
                  </span>
                  <span className="trade-status" style={{ color: st.color }}>{t(st.key)}</span>
                </div>
                <TradeActions tr={tr} onDone={load} />
              </div>
            );
          })
        ) : (
          <div className="state-empty sm"><Icon id="i-power" className="icon" /><p>{t('escrow.none')}</p></div>
        )}
      </div>

      <div className="escrow-cta">
        <button className="primary-btn wide cta-white" onClick={submit} disabled={sending}>
          <Icon id="i-shield" className="icon" />
          {sending ? t('escrow.creating') : t('escrow.initiate')}
        </button>
      </div>
    </div>
  );
}
