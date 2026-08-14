import { Icon } from './Icons';
import { useI18n } from '../i18n';

export type TabId = 'market' | 'tools' | 'escrow' | 'profile' | 'sell' | 'admin';

const TABS: Array<{ id: TabId; labelKey: string; icon: string }> = [
  { id: 'market', labelKey: 'tab.market', icon: 'i-market' },
  { id: 'tools', labelKey: 'tab.tools', icon: 'i-tools' },
  { id: 'escrow', labelKey: 'tab.escrow', icon: 'i-shield' },
  { id: 'profile', labelKey: 'tab.profile', icon: 'i-user' },
];

export function TabBar({ active, onChange, admin }: { active: TabId; onChange: (t: TabId) => void; admin?: boolean }) {
  const { t } = useI18n();
  const tabs = admin ? [...TABS, { id: 'admin' as TabId, labelKey: 'tab.admin', icon: 'i-gear' }] : TABS;
  return (
    <nav className="tabbar">
      {tabs.map((tb) => (
        <button key={tb.id} className={`tab${active === tb.id ? ' active' : ''}`} onClick={() => onChange(tb.id)}>
          <Icon id={tb.icon} />
          <span className="t-lbl">{t(tb.labelKey as never)}</span>
          <span className="ind" />
        </button>
      ))}
    </nav>
  );
}
