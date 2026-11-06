import { Download } from 'lucide-react';
import { exportToCSV } from '../lib/csv';
import type { SearchResponse, SeedInfo } from '../types';
import { ResultsTable } from './ResultsTable';
import { StatsBar } from './StatsBar';

function SeedBanner({ seed }: { seed: SeedInfo }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-indigo-50/50 px-5 py-3">
      <img src={seed.icon} alt="" className="size-10 rounded-xl" />
      <div className="text-sm">
        <div className="text-xs text-slate-500">Concorrentes de</div>
        <a href={seed.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-indigo-600">
          {seed.title}
        </a>
        <span className="text-slate-500"> · {seed.developer} · {seed.genre}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-16 text-center">
      <p className="font-semibold text-slate-800">Nenhum aplicativo passou pelos filtros.</p>
      <p className="mt-1 text-sm text-slate-500">Tente reduzir a nota mínima, os downloads ou usar outros termos.</p>
    </div>
  );
}

export function ResultsPanel({ response }: { response: SearchResponse }) {
  const hasData = response.data.length > 0;

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {response.seed && <SeedBanner seed={response.seed} />}

      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <StatsBar response={response} />
        <button
          type="button"
          onClick={() => exportToCSV(response.data, response.mode)}
          disabled={!hasData}
          className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
        >
          <Download className="size-4" /> Exportar CSV
        </button>
      </div>

      {hasData ? <ResultsTable apps={response.data} mode={response.mode} /> : <EmptyState />}
    </section>
  );
}
