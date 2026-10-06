import { useState } from 'react';
import axios from 'axios';
import { Smartphone } from 'lucide-react';
import './App.css';
import { DEFAULT_FILTERS } from './types';
import type { Filters, SearchResponse } from './types';
import { searchApps } from './api';
import { exportResultsCSV, exportFunnelCSV } from './utils/csv';
import SearchPanel from './components/SearchPanel';
import FiltersSidebar from './components/FiltersSidebar';
import FunnelPanel from './components/FunnelPanel';
import ResultsTable from './components/ResultsTable';

export default function App() {
  const [terms, setTerms] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (override?: string) => {
    const searchString = typeof override === 'string' ? override : terms;
    if (!searchString.trim()) return;
    if (typeof override === 'string') setTerms(override);

    setLoading(true);
    setError('');
    setResult(null);

    const termsArray = searchString.split(',').map(t => t.trim()).filter(Boolean);

    try {
      setResult(await searchApps(termsArray, filters));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(`A API respondeu com erro: ${err.response.data.error}`);
      } else if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
        setError('A busca passou do tempo limite. Tente com menos termos ou menos lojas.');
      } else {
        setError('Não foi possível buscar os dados. O servidor pode estar desligado ou demorando para ligar; tente de novo em 1 minuto.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const termCount = terms.split(',').filter(t => t.trim()).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Smartphone size={22} />
        <h1>AppBench</h1>
        <span>Busca de aplicativos de saúde na Play Store para pesquisa acadêmica</span>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <FiltersSidebar filters={filters} setFilters={setFilters} termCount={termCount} />
        </aside>

        <main className="content">
          <SearchPanel terms={terms} setTerms={setTerms} loading={loading} error={error} onSearch={handleSearch} />

          {!result && !loading && !error && (
            <div className="empty">
              <h2>Nenhuma pesquisa ainda</h2>
              <p>Digite os termos acima ou use um conjunto pronto. Ajuste os filtros ao lado antes de pesquisar.</p>
            </div>
          )}

          {result?.funnel && (
            <FunnelPanel
              funnel={result.funnel}
              searches={result.searches}
              meta={result.meta}
              onExport={() => exportFunnelCSV(result.funnel!, result.searches, result.meta)}
            />
          )}

          {result && result.data.length > 0 && (
            <ResultsTable results={result.data} onExport={rows => exportResultsCSV(rows, result.meta)} />
          )}

          {result && result.data.length === 0 && (
            <div className="empty">
              <h2>Nenhum app passou nos filtros</h2>
              <p>Tente diminuir a nota mínima ou desmarcar &quot;somente gratuitos&quot;.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}