import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Star } from 'lucide-react';
import { bestPosition, FIELD_LABELS, formatMonthYear, formatNumber } from '../lib/format';
import type { AppResult, SearchMode } from '../types';

type SortKey = 'relevance' | 'title' | 'score' | 'minInstalls' | 'updatedAt';

interface Props {
  apps: AppResult[];
  mode: SearchMode;
}

function SortHeader({
  label,
  column,
  sortKey,
  desc,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  desc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = !active ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
  return (
    <th className="px-4 py-3" aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}>
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

const compare: Record<Exclude<SortKey, 'relevance'>, (a: AppResult, b: AppResult) => number> = {
  title: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
  score: (a, b) => (a.score ?? -1) - (b.score ?? -1),
  minInstalls: (a, b) => a.minInstalls - b.minInstalls,
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/** Termos que encontraram o app (com a posição na busca) e onde o texto do app cita os termos pesquisados. */
function KeywordEvidence({ app }: { app: AppResult }) {
  return (
    <div className="flex max-w-64 flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {app.sources.map((s) => (
          <span
            key={s.query}
            title={`Posição ${s.position} na busca por "${s.query}" no momento da coleta`}
            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
          >
            {s.query} <span className="font-normal text-indigo-500">#{s.position}</span>
          </span>
        ))}
      </div>
      {app.termMatches.length > 0 ? (
        <span className="text-xs text-slate-500">
          Cita: {app.termMatches.map((m) => `${m.term} (${FIELD_LABELS[m.field]})`).join(', ')}
        </span>
      ) : (
        <span className="text-xs text-amber-700" title="Nenhum termo pesquisado aparece no título, no resumo ou na descrição">
          Não cita os termos no texto
        </span>
      )}
    </div>
  );
}

export function ResultsTable({ apps, mode }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    if (sortKey === 'relevance') return apps; // a API já entrega na ordem de relevância da loja
    const cmp = compare[sortKey];
    return [...apps].sort((a, b) => (desc ? -cmp(a, b) : cmp(a, b)));
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
            <th className="px-4 py-3 uppercase tracking-wider">Monetização</th>
            <SortHeader label="Atualizado" column="updatedAt" {...headerProps} />
            <SortHeader label={mode === 'similar' ? 'Posição' : 'Encontrado por'} column="relevance" {...headerProps} />
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
                      className="group inline-flex max-w-full items-center gap-1 font-semibold text-slate-900 hover:text-indigo-600"
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
              <td className="whitespace-nowrap px-4 py-3">
                {a.scoreText ? (
                  <>
                    <div className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {a.scoreText}
                    </div>
                    <div className="text-xs text-slate-400">{formatNumber(a.ratings)} aval.</div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Sem avaliações</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{a.installs || '-'}</td>
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    a.free ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {a.free ? 'Gratuito' : a.priceText}
                </span>
                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                  {a.adSupported && <div>Contém anúncios</div>}
                  {a.offersIAP && <div title={a.iapRange || undefined}>Compras no app</div>}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatMonthYear(a.updatedAt)}</td>
              <td className="px-4 py-3">
                {mode === 'similar' ? (
                  <span className="text-xs text-slate-500" title='Posição na lista "Apps semelhantes" da loja'>
                    #{bestPosition(a.sources)}
                  </span>
                ) : (
                  <KeywordEvidence app={a} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
