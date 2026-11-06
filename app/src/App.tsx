import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { FiltersPanel } from './components/FiltersPanel';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ResultsPanel } from './components/ResultsPanel';
import { SearchForm } from './components/SearchForm';
import { SearchModeTabs } from './components/SearchModeTabs';
import { SearchProgress } from './components/SearchProgress';
import { useAppSearch } from './hooks/useAppSearch';
import { categoryOptions, countActive } from './lib/criteria';

export default function App() {
  const s = useAppSearch();
  const { response, analysis, loading } = s;

  const categories = useMemo(() => (response ? categoryOptions(response.apps) : null), [response]);
  const activeFilters = countActive(s.criteria);
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

          <SearchModeTabs mode={s.mode} onChange={s.changeMode} disabled={loading} />
          <SearchForm
            mode={s.mode}
            query={s.query}
            onQueryChange={s.setQuery}
            market={s.market}
            onMarketChange={s.setMarket}
            onSubmit={() => void s.search()}
            loading={loading}
          />

          {loading && <SearchProgress progress={s.progress} />}
          {s.error && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" /> {s.error}
            </p>
          )}
        </section>

        <div className="mx-auto mt-6 max-w-5xl">
          <FiltersPanel
            mode={response?.mode ?? s.mode}
            criteria={s.criteria}
            onChange={s.setCriteria}
            onReset={s.resetCriteria}
            categories={categories}
            seedCategory={response?.seed}
            summary={analysis && response ? { included: analysis.included.length, total: response.funnel.unique } : undefined}
          />
        </div>

        {response && analysis && (
          <ResultsPanel
            response={response}
            analysis={analysis}
            criteria={s.criteria}
            activeFilters={activeFilters}
            onResetCriteria={s.resetCriteria}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
