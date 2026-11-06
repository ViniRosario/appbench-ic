import { Loader2 } from 'lucide-react';
import { formatNumber } from '../lib/format';
import type { JobProgress } from '../types';

const UNIT: Record<JobProgress['phase'], string> = {
  queued: '',
  search: 'termos',
  details: 'apps',
  retry: 'apps',
  done: 'apps',
};

export function SearchProgress({ progress }: { progress: JobProgress | null }) {
  const showCount = progress !== null && progress.total > 1;
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
          <Loader2 className="size-4 shrink-0 animate-spin text-indigo-600" />
          {progress?.message ?? 'Iniciando a busca (o servidor pode levar até 1 min para acordar)'}
        </span>
        {showCount && (
          <span className="tabular-nums text-slate-500">
            {formatNumber(progress.done)} de {formatNumber(progress.total)} {UNIT[progress.phase]}
          </span>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-indigo-600 transition-all duration-500 ${pct === null ? 'w-1/4 animate-pulse' : ''}`}
          style={pct === null ? undefined : { width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        A página de cada app é lida individualmente na Play Store. Buscas com vários termos podem levar alguns minutos.
      </p>
    </div>
  );
}
