import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { AppData } from '../types';

type SortKey = 'title' | 'score' | 'updatedYear' | 'minInstalls';
const DOWNLOAD_STEPS = [0, 1000, 10000, 100000, 1000000];

interface Props {
  results: AppData[];
  onExport: (rows: AppData[]) => void;
}

const num = (a: AppData, key: Exclude<SortKey, 'title'>): number =>
  key === 'score' ? Number(a.score) || 0 : key === 'updatedYear' ? a.updatedYear ?? 0 : a.minInstalls ?? -1;

export default function ResultsTable({ results, onExport }: Props) {
  const [query, setQuery] = useState('');
  const [minYear, setMinYear] = useState(0);
  const [minDownloads, setMinDownloads] = useState(0);
  const [onlyDup, setOnlyDup] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [asc, setAsc] = useState(false);
  const thisYear = new Date().getFullYear();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = results.filter(a =>
      (!q || `${a.title} ${a.developer} ${a.summary}`.toLowerCase().includes(q)) &&
      (!minYear || (a.updatedYear ?? 0) >= minYear) &&
      (!minDownloads || (a.minInstalls ?? 0) >= minDownloads) &&
      (!onlyDup || a.isDuplicate)
    );
    return [...filtered].sort((a, b) => {
      const d = sortKey === 'title' ? a.title.localeCompare(b.title) : num(a, sortKey) - num(b, sortKey);
      return asc ? d : -d;
    });
  }, [results, query, minYear, minDownloads, onlyDup, sortKey, asc]);

  const sortHeader = (key: SortKey, label: string) => (
    <th>
      <button
        className="sort"
        onClick={() => {
          if (sortKey === key) setAsc(!asc);
          else { setSortKey(key); setAsc(key === 'title'); }
        }}
      >
        {label}{sortKey === key ? (asc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <section className="results">
      <div className="section-head">
        <h2>Apps encontrados <span className="count">Mostrando {rows.length} de {results.length}</span></h2>
        <button onClick={() => onExport(rows)} className="btn btn-ghost"><Download size={16} /> Exportar o que está na tabela</button>
      </div>

      <div className="toolbar">
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, desenvolvedor ou descrição" />
        <select value={minYear} onChange={e => setMinYear(Number(e.target.value))} aria-label="Atualizado desde">
          <option value={0}>Qualquer ano de atualização</option>
          {[thisYear - 3, thisYear - 2, thisYear - 1, thisYear].map(y => <option key={y} value={y}>Atualizado desde {y}</option>)}
        </select>
        <select value={minDownloads} onChange={e => setMinDownloads(Number(e.target.value))} aria-label="Downloads mínimos">
          {DOWNLOAD_STEPS.map(v => (
            <option key={v} value={v}>{v === 0 ? 'Qualquer número de downloads' : `${v.toLocaleString('pt-BR')}+ downloads`}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyDup} onChange={e => setOnlyDup(e.target.checked)} />
          Só os que apareceram em mais de um termo
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {sortHeader('title', 'Título')}
              {sortHeader('score', 'Nota')}
              {sortHeader('updatedYear', 'Atualizado')}
              {sortHeader('minInstalls', 'Downloads')}
              <th>Termos que o encontraram</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(app => (
              <tr key={app.appId}>
                <td className="cell-title">
                  <a href={app.url} target="_blank" rel="noopener noreferrer">{app.title}</a>
                  <span className="cell-sub">{app.developer}{app.free ? '' : ' · pago'}</span>
                </td>
                <td>{app.score}</td>
                <td>{app.updatedYear ?? '-'}</td>
                <td>{app.detailsFailed ? <span className="badge badge-warn">sem detalhes</span> : app.installs ?? '-'}</td>
                <td>
                  {app.keywordOrigin.split(', ').map(k => <span key={k} className="badge">{k}</span>)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="empty-row">Nenhum app atende aos filtros da tabela. Afrouxe algum deles.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
