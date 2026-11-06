import { Globe, Link2, Loader2, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MARKETS } from '../lib/markets';
import type { Market } from '../lib/markets';
import type { SearchMode } from '../types';

interface Props {
  mode: SearchMode;
  query: string;
  onQueryChange: (value: string) => void;
  market: Market;
  onMarketChange: (market: Market) => void;
  onSubmit: () => void;
  loading: boolean;
}

const MODE_COPY: Record<SearchMode, { placeholder: string; hint: string; icon: LucideIcon }> = {
  keyword: {
    placeholder: 'Ex: gravidez, gestante, cuidado pré-natal',
    hint: 'Separe vários termos por vírgula. Cada termo traz a lista completa que a loja exibe (até 250 apps).',
    icon: Search,
  },
  similar: {
    placeholder: 'Cole a URL da Play Store ou o ID do app (ex: com.nu.production)',
    hint: 'Usamos a lista "Apps semelhantes" que a própria Play Store exibe na página do app informado.',
    icon: Link2,
  },
};

export function SearchForm({ mode, query, onQueryChange, market, onMarketChange, onSubmit, loading }: Props) {
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
        <label
          className="flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm text-slate-600 sm:rounded-full sm:border-l sm:border-slate-200 sm:pl-3"
          title="Loja (país) consultada. O idioma da loja define a língua dos textos dos apps."
        >
          <Globe className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Loja</span>
          <select
            value={market.country}
            disabled={loading}
            onChange={(e) => {
              const next = MARKETS.find((m) => m.country === e.target.value);
              if (next) onMarketChange(next);
            }}
            className="h-9 bg-transparent pr-1 text-sm outline-none disabled:opacity-60"
          >
            {MARKETS.map((m) => (
              <option key={m.country} value={m.country}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
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
