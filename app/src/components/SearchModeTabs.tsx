import { Search, Users } from 'lucide-react';
import type { SearchMode } from '../types';

interface Props {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  disabled?: boolean;
}

const TABS = [
  { id: 'keyword' as const, label: 'Por palavra-chave', icon: Search },
  { id: 'similar' as const, label: 'Por concorrente', icon: Users },
];

export function SearchModeTabs({ mode, onChange, disabled }: Props) {
  return (
    <div role="tablist" aria-label="Modo de pesquisa" className="inline-flex rounded-full bg-slate-200/70 p-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
              active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
