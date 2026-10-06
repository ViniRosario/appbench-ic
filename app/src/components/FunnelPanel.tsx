import { Download } from 'lucide-react';
import type { Funnel, SearchLog, SearchMeta } from '../types';

interface Props {
  funnel: Funnel;
  searches: SearchLog[];
  meta: SearchMeta | null;
  onExport: () => void;
}

export default function FunnelPanel({ funnel, searches, meta, onExport }: Props) {
  const minScore = meta?.minScore ?? 4;
  const stages: { label: string; value: number }[] = [
    { label: 'Resultados brutos das buscas', value: funnel.rawHits },
    { label: 'Apps únicos', value: funnel.uniqueApps },
    { label: minScore > 0 ? `Nota ${minScore} ou mais` : 'Com nota', value: funnel.passedScoreFilter },
  ];
  if (meta?.onlyFree) stages.push({ label: 'Gratuitos', value: funnel.passedScoreFilter - funnel.notFree });
  stages.push({ label: 'Amostra final', value: funnel.finalSample });

  const max = Math.max(funnel.rawHits, 1);

  return (
    <section className="funnel">
      <div className="section-head">
        <h2>De onde vieram os {funnel.finalSample} apps</h2>
        <button onClick={onExport} className="btn btn-ghost"><Download size={16} /> Exportar funil</button>
      </div>

      <ul className="bars">
        {stages.map(s => (
          <li key={s.label}>
            <span className="bar-label">{s.label}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max((s.value / max) * 100, 1.5)}%` }} /></span>
            <strong className="bar-value">{s.value}</strong>
          </li>
        ))}
      </ul>

      <p className="funnel-note">
        Ficaram de fora: {funnel.duplicatesMerged} repetidos entre buscas, {funnel.noScore} sem nota, {funnel.belowMinScore} abaixo da nota mínima
        {meta?.onlyFree ? `, ${funnel.notFree} pagos` : ''}.
        {funnel.detailsFailed > 0 && ` ${funnel.detailsFailed} app(s) da amostra ficaram sem detalhes de downloads e ano.`}
      </p>

      <details className="searches">
        <summary>Ver o resultado de cada busca ({searches.length})</summary>
        <table>
          <thead><tr><th>Termo</th><th>Loja</th><th>Retornados</th><th>Situação</th></tr></thead>
          <tbody>
            {searches.map((s, i) => (
              <tr key={i}>
                <td>{s.term}</td>
                <td>{s.country}/{s.lang}</td>
                <td>{s.returned} de {s.requested}</td>
                <td>{s.error ? 'Falhou' : s.returned >= s.requested ? 'Atingiu o limite, pode haver mais' : 'Completa'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {meta && <p className="funnel-note">Coleta feita em {new Date(meta.collectedAt).toLocaleString('pt-BR')}.</p>}
    </section>
  );
}
