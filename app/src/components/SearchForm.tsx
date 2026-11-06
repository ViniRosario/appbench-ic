import { Link2, Loader2, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SearchMode } from '../types';

interface Props {
  mode: SearchMode;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const MODE_COPY: Record<SearchMode, { placeholder: string; hint: string; icon: LucideIcon }> = {
  keyword: {
    placeholder: 'Ex: gravidez, gestante, cuidado pré-natal',
    hint: 'Separe vários termos por vírgula para comparar e identificar apps em comum.',
    icon: Search,
  },
  similar: {
    placeholder: 'Cole a URL da Play Store ou o ID do app (ex: com.nu.production)',
    hint: 'Encontramos os concorrentes que a própria Play Store associa ao app informado.',
    icon: Link2,
  },
};

export function SearchForm({ mode, query, onQueryChange, onSubmit, loading }: Props) {
  const { placeholder, hint, icon: InputIcon } = MODE_COPY[mode];

  return (
    <>
      <form
        className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 sm:flex-row sm:items-center sm:rounded-full sm:pl-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-1 items-center gap-3 px-2 sm:px-0">
          <InputIcon className="size-5 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 w-full min-w-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {loading ? 'Extraindo...' : 'Pesquisar'}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </>
  );
}
