import { REGION_OPTIONS } from '../types';
import type { Filters } from '../types';

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  termCount: number;
}

export default function FiltersSidebar({ filters, setFilters, termCount }: Props) {
  const searchCount = termCount * filters.regionKeys.length;

  const toggleRegion = (key: string) => {
    const has = filters.regionKeys.includes(key);
    if (has && filters.regionKeys.length === 1) return; // mantém ao menos uma loja
    setFilters({
      ...filters,
      regionKeys: has ? filters.regionKeys.filter(k => k !== key) : [...filters.regionKeys, key],
    });
  };

  return (
    <div className="side-inner">
      <h2>Filtros da coleta</h2>
      <p className="hint">Valem para a próxima busca. Depois, você ainda pode refinar a tabela de resultados.</p>

      <label className="field">
        Nota mínima
        <select value={filters.minScore} onChange={e => setFilters({ ...filters, minScore: Number(e.target.value) })}>
          {[0, 3, 3.5, 4, 4.5].map(v => (
            <option key={v} value={v}>{v === 0 ? 'Sem filtro de nota' : `${v} estrelas ou mais`}</option>
          ))}
        </select>
      </label>

      <label className="field">
        Resultados por termo
        <select value={filters.limit} onChange={e => setFilters({ ...filters, limit: Number(e.target.value) })}>
          {[50, 100, 150, 250].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={filters.onlyFree} onChange={e => setFilters({ ...filters, onlyFree: e.target.checked })} />
        Somente apps gratuitos
      </label>

      <fieldset className="field-group">
        <legend>Lojas consultadas</legend>
        {REGION_OPTIONS.map(r => (
          <label key={r.key} className="check">
            <input type="checkbox" checked={filters.regionKeys.includes(r.key)} onChange={() => toggleRegion(r.key)} />
            {r.label}
          </label>
        ))}
      </fieldset>

      <p className="hint">
        {searchCount > 0
          ? `${searchCount} busca(s) nesta pesquisa: ${termCount} termo(s) em ${filters.regionKeys.length} loja(s). Quanto mais lojas, mais demora.`
          : 'Digite os termos para ver quantas buscas serão feitas.'}
      </p>
    </div>
  );
}
