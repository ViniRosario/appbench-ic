import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Star } from 'lucide-react';
import type { AppResult, SearchMode } from '../types';

type SortKey = 'relevance' | 'title' | 'score' | 'minInstalls' | 'updatedAt';

interface Props {
  apps: AppResult[];
  mode: SearchMode;
}

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '-';

function SortHeader({
  label,
  column,
  sortKey,
  desc,
  onSort,
  className = '',
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  desc: boolean;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = !active ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
  return (
    <th className={`px-4 py-3 ${className}`} aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  );
}

export function ResultsTable({ apps, mode }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    if (sortKey === 'relevance') return apps; // a API já entrega ordenado por relevância
    const copy = [...apps];
    copy.sort((a, b) => {
      const cmp = sortKey === 'title' || sortKey === 'updatedAt'
        ? a[sortKey].localeCompare(b[sortKey])
        : a[sortKey] - b[sortKey];
      return desc ? -cmp : cmp;
    });
    return copy;
  }, [apps, sortKey, desc]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(key !== 'title');
    }
  };

  const headerProps = { sortKey, desc, onSort };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
          <tr>
            <SortHeader label="Aplicativo" column="title" {...headerProps} />
            <th className="px-4 py-3 uppercase tracking-wider">Categoria</th>
            <SortHeader label="Nota" column="score" {...headerProps} />
            <SortHeader label="Downloads" column="minInstalls" {...headerProps} />
            <th className="px-4 py-3 uppercase tracking-wider">Preço</th>
            <SortHeader label="Atualizado" column="updatedAt" {...headerProps} />
            <SortHeader
              label={mode === 'similar' ? 'Relevância' : 'Palavras-chave'}
              column="relevance"
              {...headerProps}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((a) => (
            <tr key={a.appId} className="transition hover:bg-slate-50/80">
              <td className="px-4 py-3">
                <div className="flex min-w-72 max-w-md items-center gap-3">
                  <img src={a.icon} alt="" loading="lazy" className="size-11 shrink-0 rounded-xl bg-slate-100 object-cover" />
                  <div className="min-w-0">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      <span className="truncate">{a.title}</span>
                      <ExternalLink className="size-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
                    </a>
                    <div className="truncate text-xs text-slate-500">{a.developer}</div>
                    {a.summary && <div className="truncate text-xs text-slate-400">{a.summary}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {a.genre || '-'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {a.score ? a.score.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-slate-400">{a.ratings.toLocaleString('pt-BR')} aval.</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{a.installs}</td>
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    a.free ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {a.free ? 'Gratuito' : a.priceText}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(a.updatedAt)}</td>
              <td className="px-4 py-3">
                {mode === 'similar' ? (
                  <span className="text-xs text-slate-500" title={`Aparece em: ${a.sources.join(', ')}`}>
                    Citado {a.sources.length}x
                  </span>
                ) : (
                  <div className="flex max-w-60 flex-wrap gap-1">
                    {a.sources.map((k) => (
                      <span key={k} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
