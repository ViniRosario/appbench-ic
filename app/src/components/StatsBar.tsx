import type { LucideIcon } from 'lucide-react';
import { Copy, Filter, Layers, ScanSearch } from 'lucide-react';
import type { SearchResponse } from '../types';

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="size-4" />
      </span>
      <div className="leading-tight">
        <div className="text-lg font-semibold text-slate-900">{value.toLocaleString('pt-BR')}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function StatsBar({ response }: { response: SearchResponse }) {
  const { excluded } = response;
  const totalExcluded =
    excluded.score + excluded.installs + excluded.outdated + excluded.games + excluded.price + excluded.offTopic;

  const breakdown = [
    { n: excluded.games, label: 'jogos' },
    { n: excluded.score, label: 'nota baixa' },
    { n: excluded.installs, label: 'poucos downloads' },
    { n: excluded.outdated, label: 'desatualizados' },
    { n: excluded.price, label: 'preço' },
    { n: excluded.offTopic, label: 'outra categoria' },
    { n: excluded.failed, label: 'falha ao ler detalhes' },
  ].filter((b) => b.n > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Stat icon={Layers} value={response.total} label="Apps na amostra" />
        <Stat icon={ScanSearch} value={response.scanned} label="Apps analisados" />
        <Stat icon={Filter} value={totalExcluded} label="Removidos por filtros" />
        {response.mode === 'keyword' && (
          <Stat icon={Copy} value={response.duplicatedCount} label="Em mais de um termo" />
        )}
      </div>
      {breakdown.length > 0 && (
        <p className="text-xs text-slate-500">
          Removidos: {breakdown.map((b) => `${b.n} ${b.label}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
