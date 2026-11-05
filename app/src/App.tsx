import { useState } from 'react';
import { AlertCircle, BarChart3, Download, Link2, Loader2, Search } from 'lucide-react';
import { SearchModeTabs } from './components/SearchModeTabs';
import { FiltersPanel } from './components/FiltersPanel';
import { StatsBar } from './components/StatsBar';
import { ResultsTable } from './components/ResultsTable';
import { getErrorMessage, searchByKeywords, searchSimilar } from './lib/api';
import { exportToCSV } from './lib/csv';
import type { Filters, SearchMode, SearchResponse } from './types';

const DEFAULT_FILTERS: Filters = {
  minScore: 4,
  minInstalls: 0,
  recentOnly: false,
  excludeGames: true,
  price: 'all',
};

const MODE_COPY: Record<SearchMode, { placeholder: string; hint: string; icon: typeof Search }> = {
  keyword: {
    placeholder: 'Ex: controle financeiro, gestão de estoque, CRM',
    hint: 'Separe vários termos por vírgula para comparar e identificar apps em comum.',
    icon: Search,
  },
  similar: {
    placeholder: 'Cole a URL da Play Store ou o ID do app (ex: com.nu.production)',
    hint: 'Encontramos os concorrentes que a própria Play Store associa ao app informado.',
    icon: Link2,
  },
};

export default function App() {
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const copy = MODE_COPY[mode];
  const InputIcon = copy.icon;

  const changeMode = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery('');
    setError('');
  };

  const handleSearch = async () => {
    const value = query.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result =
        mode === 'keyword'
          ? await searchByKeywords(value.split(',').map((t) => t.trim()).filter(Boolean), filters)
          : await searchSimilar(value, filters);
      setResponse(result);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showHero = !response && !loading;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BarChart3 className="size-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">AppBench</span>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">Benchmarking de aplicativos · Google Play</span>
        </div>
      </header>

      <main className={`mx-auto max-w-7xl px-4 pb-16 sm:px-6 ${showHero ? 'pt-16 sm:pt-24' : 'pt-8'}`}>
        <section className="mx-auto max-w-3xl text-center">
          {showHero && (
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Mapeie o mercado de apps <span className="text-indigo-600">em minutos</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 sm:text-lg">
                Extraia amostras limpas e estruturadas da Play Store por palavra-chave ou a partir de um concorrente, e
                exporte para análise.
              </p>
            </div>
          )}

          <SearchModeTabs mode={mode} onChange={changeMode} disabled={loading} />

          <form
            className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 sm:flex-row sm:items-center sm:rounded-full sm:pl-5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch();
            }}
          >
            <div className="flex flex-1 items-center gap-3 px-2 sm:px-0">
              <InputIcon className="size-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.placeholder}
                aria-label={copy.placeholder}
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
          <p className="mt-2 text-xs text-slate-400">{copy.hint}</p>

          <div className="mt-6">
            <FiltersPanel filters={filters} onChange={setFilters} disabled={loading} />
          </div>

          {loading && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="size-4" />
              Realizando busca profunda em cada app. Pode levar até 1 minuto.
            </p>
          )}
          {error && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </p>
          )}
        </section>

        {response && (
          <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {response.seed && (
              <div className="flex items-center gap-3 border-b border-slate-200 bg-indigo-50/50 px-5 py-3">
                <img src={response.seed.icon} alt="" className="size-10 rounded-xl" />
                <div className="text-sm">
                  <div className="text-xs text-slate-500">Concorrentes de</div>
                  <a href={response.seed.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-indigo-600">
                    {response.seed.title}
                  </a>
                  <span className="text-slate-500"> · {response.seed.developer} · {response.seed.genre}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <StatsBar response={response} />
              <button
                type="button"
                onClick={() => exportToCSV(response.data, response.mode)}
                disabled={response.data.length === 0}
                className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
              >
                <Download className="size-4" /> Exportar CSV
              </button>
            </div>

            {response.data.length > 0 ? (
              <ResultsTable apps={response.data} mode={response.mode} />
            ) : (
              <div className="px-5 py-16 text-center">
                <p className="font-semibold text-slate-800">Nenhum aplicativo passou pelos filtros.</p>
                <p className="mt-1 text-sm text-slate-500">Tente reduzir a nota mínima, os downloads ou usar outros termos.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
