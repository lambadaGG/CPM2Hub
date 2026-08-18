import { Icon } from './Icons';
import { useI18n } from '../i18n';

export type TabId = 'home' | 'garage' | 'explore' | 'tools' | 'profile' | 'sell' | 'escrow' | 'admin';

const TABS: Array<{ id: TabId; labelKey: string; icon: string }> = [
  { id: 'home', labelKey: 'tab.home', icon: 'i-home' },
  { id: 'garage', labelKey: 'tab.garage', icon: 'i-wrench' },
  { id: 'explore', labelKey: 'tab.explore', icon: 'i-compass' },
  { id: 'tools', labelKey: 'tab.tools', icon: 'i-tools' },
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
