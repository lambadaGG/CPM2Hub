import { Icon } from './Icons';
import { useI18n } from '../i18n';

export type TabId = 'market' | 'tools' | 'escrow' | 'profile';

const TABS: Array<{ id: TabId; labelKey: string; icon: string }> = [
  { id: 'market', labelKey: 'tab.market', icon: 'i-market' },
  { id: 'tools', labelKey: 'tab.tools', icon: 'i-tools' },
  { id: 'escrow', labelKey: 'tab.escrow', icon: 'i-shield' },
  { id: 'profile', labelKey: 'tab.profile', icon: 'i-user' },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar">
      {TABS.map((tb) => (
        <button key={tb.id} className={`tab${active === tb.id ? ' active' : ''}`} onClick={() => onChange(tb.id)}>
          <Icon id={tb.icon} />
          <span className="t-lbl">{t(tb.labelKey as never)}</span>
          <span className="ind" />
        </button>
      ))}
    </nav>
  );
}
