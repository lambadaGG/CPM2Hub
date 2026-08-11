import { Icon } from './Icons';

export type TabId = 'market' | 'tools' | 'escrow' | 'profile';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'market', label: 'Market', icon: 'i-market' },
  { id: 'tools', label: 'Tools', icon: 'i-tools' },
  { id: 'escrow', label: 'Escrow', icon: 'i-shield' },
  { id: 'profile', label: 'Profile', icon: 'i-user' },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={`tab${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          <Icon id={t.icon} />
          <span className="t-lbl">{t.label}</span>
          <span className="ind" />
        </button>
      ))}
    </nav>
  );
}
