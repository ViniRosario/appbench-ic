import { FileSpreadsheet, ListChecks, TriangleAlert } from 'lucide-react';
import { exportAudit, exportSample } from '../lib/csv';
import type { Analysis, Criteria } from '../lib/criteria';
import { formatDateTime } from '../lib/format';
import { marketLabel } from '../lib/markets';
import type { SearchResponse, SeedInfo } from '../types';
import { FunnelPanel } from './FunnelPanel';
import { ResultsTable } from './ResultsTable';

interface Props {
  response: SearchResponse;
  analysis: Analysis;
  criteria: Criteria;
  activeFilters: number;
  onResetCriteria: () => void;
}

function SeedBanner({ seed }: { seed: SeedInfo }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-indigo-50/50 px-5 py-3">
      <img src={seed.icon} alt="" className="size-10 rounded-xl" />
      <div className="text-sm">
        <div className="text-xs text-slate-500">Apps semelhantes, segundo a Play Store, a</div>
        <a href={seed.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-indigo-600">
          {seed.title}
        </a>
        <span className="text-slate-500"> · {seed.developer} · {seed.genre}</span>
      </div>
    </div>
  );
}

function Notices({ notices }: { notices: string[] }) {
  if (notices.length === 0) return null;
  return (
    <ul className="space-y-2 border-b border-slate-200 bg-amber-50/60 px-5 py-3">
      {notices.map((n) => (
        <li key={n} className="flex gap-2 text-xs text-amber-800">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {n}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ activeFilters, onResetCriteria }: { activeFilters: number; onResetCriteria: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      {activeFilters > 0 ? (
        <>
          <p className="font-semibold text-slate-800">Nenhum app passa pelos filtros atuais.</p>
          <p className="mt-1 text-sm text-slate-500">O funil acima mostra quantos apps cada filtro excluiu.</p>
          <button type="button" onClick={onResetCriteria} className="mt-4 text-sm font-medium text-indigo-600 hover:underline">
            Limpar filtros
          </button>
        </>
      ) : (
        <p className="font-semibold text-slate-800">A coleta não encontrou apps.</p>
      )}
    </div>
  );
}

const buttonClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

export function ResultsPanel({ response, analysis, criteria, activeFilters, onResetCriteria }: Props) {
  const hasData = analysis.included.length > 0;

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {response.seed && <SeedBanner seed={response.seed} />}

      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <FunnelPanel response={response} analysis={analysis} />
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <button type="button" onClick={() => exportSample(response, analysis)} disabled={!hasData} className={buttonClass}>
            <FileSpreadsheet className="size-4" /> Exportar amostra
          </button>
          <button
            type="button"
            onClick={() => exportAudit(response, analysis, criteria)}
            className={buttonClass}
            title="Todos os apps encontrados, incluídos e excluídos, com o motivo de cada exclusão e os critérios usados"
          >
            <ListChecks className="size-4" /> Exportar auditoria
          </button>
        </div>
      </div>

      <Notices notices={response.notices} />

      {hasData ? (
        <ResultsTable apps={analysis.included} mode={response.mode} />
      ) : (
        <EmptyState activeFilters={activeFilters} onResetCriteria={onResetCriteria} />
      )}

      <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-400">
        Dados lidos da Google Play ({marketLabel(response.collection.country)}) em {formatDateTime(response.collectedAt)}.
        Notas e downloads exatamente como a loja exibe. Posições refletem a loja no momento da coleta.
      </p>
    </section>
  );
}
