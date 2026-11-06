import { AlertCircle } from 'lucide-react';
import { FiltersPanel } from './components/FiltersPanel';
import { Header } from './components/Header';
import { ResultsPanel } from './components/ResultsPanel';
import { SearchForm } from './components/SearchForm';
import { SearchModeTabs } from './components/SearchModeTabs';
import { useAppSearch } from './hooks/useAppSearch';

export default function App() {
  const { mode, changeMode, query, setQuery, filters, setFilters, response, loading, error, search } = useAppSearch();

  const showHero = !response && !loading;

  return (
    <div className="min-h-screen">
      <Header />

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
          <SearchForm mode={mode} query={query} onQueryChange={setQuery} onSubmit={() => void search()} loading={loading} />

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

        {response && <ResultsPanel response={response} />}
      </main>
    </div>
  );
}
