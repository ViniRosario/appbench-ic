import type { LucideIcon } from 'lucide-react';
import { CircleCheck, Filter, Layers, ScanSearch } from 'lucide-react';
import { EXCLUSION_ORDER, REASON_LABELS } from '../lib/criteria';
import type { Analysis } from '../lib/criteria';
import { formatNumber } from '../lib/format';
import type { SearchResponse } from '../types';

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="size-4" />
      </span>
      <div className="leading-tight">
        <div className="text-lg font-semibold text-slate-900">{formatNumber(value)}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

/** Funil: o que a loja retornou (coleta), o que os filtros excluíram (e por quê) e o que ficou na amostra. */
export function FunnelPanel({ response, analysis }: { response: SearchResponse; analysis: Analysis }) {
  const { funnel, queries, mode, collection } = response;
  const breakdown = EXCLUSION_ORDER.filter((r) => analysis.stats[r] > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Stat icon={ScanSearch} value={funnel.unique} label={mode === 'keyword' ? 'Apps únicos na loja' : 'Apps semelhantes na loja'} />
        <Stat icon={Filter} value={analysis.excludedTotal} label="Excluídos" />
        <Stat icon={Layers} value={analysis.included.length} label="Na amostra final" />
      </div>

      <dl className="space-y-1 text-xs text-slate-500">
        <div>
          <dt className="inline font-medium text-slate-600">{mode === 'keyword' ? 'Retornados por termo: ' : 'Lista da loja: '}</dt>
          <dd className="inline">
            {queries
              .map((q) => {
                const notes = [
                  ...(q.reachedStoreLimit ? [`limite de ${collection.storeLimit} da loja`] : []),
                  ...(q.intermittent > 0 ? [`união de ${q.passes} consultas`] : []),
                ];
                return `${q.query} ${formatNumber(q.found)}${notes.length ? ` (${notes.join('; ')})` : ''}`;
              })
              .join(' · ')}
            {mode === 'keyword' && funnel.duplicates > 0 && ` · ${formatNumber(funnel.duplicates)} repetidos entre termos`}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-600">Excluídos: </dt>
          <dd className="inline">
            {breakdown.length > 0
              ? breakdown.map((r) => `${formatNumber(analysis.stats[r])} ${REASON_LABELS[r]}`).join(' · ')
              : 'nenhum (sem filtros ativos)'}
          </dd>
        </div>
      </dl>

      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CircleCheck className="size-3.5 shrink-0" />
        Conferência: {formatNumber(funnel.unique)} únicos = {formatNumber(analysis.included.length)} incluídos +{' '}
        {formatNumber(analysis.excludedTotal)} excluídos
      </p>
    </div>
  );
}
