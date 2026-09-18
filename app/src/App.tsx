import { useState } from 'react';
import axios from 'axios';
import { Search, Download, Loader2, Smartphone, Globe, AlertCircle } from 'lucide-react';
import './App.css';

interface AppData {
  title: string;
  developer: string;
  score: string | number;
  free: boolean;
  summary: string;
  keywordOrigin: string;
  url: string;
  isDuplicate: boolean;
  installs: string;
  updatedYear: number;
}

export default function App() {
  const [terms, setTerms] = useState('');
  const [results, setResults] = useState<AppData[]>([]);
  const [duplicatedTotal, setDuplicatedTotal] = useState(0); // Nova variável para o total de duplicados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (overrideTerms?: string) => {
    const searchString = typeof overrideTerms === 'string' ? overrideTerms : terms;
    if (!searchString.trim()) return;
    
    if (typeof overrideTerms === 'string') {
      setTerms(overrideTerms);
    }

    setLoading(true);
    setError('');
    setResults([]);
    setDuplicatedTotal(0);

    const termsArray = searchString.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await axios.post('https://api-appbench.onrender.com/api/search', {
        terms: termsArray,
      });
      setResults(response.data.data);
      setDuplicatedTotal(response.data.duplicatedCount); // Salva o total de duplicados
    } catch (err) {
      setError('Erro ao buscar dados. O servidor demorou muito ou está desligado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    
    // Atualizamos o cabeçalho do Excel
    const headers = ['Título;Desenvolvedor;Ano;Downloads;Duplicado;Nota;Gratuito;Palavra-Chave;Descrição;Link\n'];
    
    const rows = results.map(app => {
      const cleanSummary = app.summary ? app.summary.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""') : 'Sem descrição';
      // Inserimos os novos dados nas colunas corretas
      return `"${app.title}";"${app.developer}";"${app.updatedYear}";"${app.installs}";"${app.isDuplicate ? 'Sim' : 'Não'}";"${app.score}";"${app.free ? 'Sim' : 'Não'}";"${app.keywordOrigin}";"${cleanSummary}";"${app.url}"`;
    });
    
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'benchmarking_apps_pesquisa.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-title">
          <Smartphone className="icon-large" />
          <h1>AppBench <span>| Intelligence</span></h1>
        </div>
        <p>Extrator metodológico para benchmarking de aplicativos na Play Store (Filtro 4+ Estrelas)</p>
      </header>

      <main className="main-content">
        <div className="search-card">
          <label htmlFor="search">Termos de busca (separados por vírgula):</label>
          <div className="input-group">
            <input 
              id="search"
              type="text" 
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Ex: pré-natal, gestante, saúde da mulher"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => handleSearch()} disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="spin icon-small" /> : <Search className="icon-small" />}
              {loading ? 'Extraindo...' : 'Pesquisar'}
            </button>
          </div>
          
          {loading && (
            <p className="loading-warning">
              <AlertCircle className="icon-tiny" /> 
              Realizando Busca Profunda. Isso pode levar até 30 segundos...
            </p>
          )}
          
          {error && <p className="error-text">{error}</p>}

          <div className="quick-searches">
            <span className="quick-searches-label">
              <Globe className="icon-tiny" /> Matrizes Globais:
            </span>
            <button onClick={() => handleSearch('gestante, gravidez, pregnant, pregnancy, embarazada, embarazo, grossesse')} className="btn-chip" disabled={loading}>
              Foco: Gestação (7)
            </button>
            <button onClick={() => handleSearch('pré-natal, prenatal care, prenatal, atención prenatal, cuidados prenatales, soins prénatals')} className="btn-chip" disabled={loading}>
              Foco: Pré-natal (6)
            </button>
            <button onClick={() => handleSearch('saúde da mulher, saúde materna, maternal health, women\'s health, salud materna, salud de la mujer')} className="btn-chip" disabled={loading}>
              Foco: Saúde Materna (6)
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="results-card">
            <div className="results-header">
              <div className="dashboard-stats">
                <h2 className="title-destaque">{results.length} Apps Aprovados</h2>
                <span className="stats-badge duplicados-badge">
                  {duplicatedTotal} {duplicatedTotal === 1 ? 'Duplicata Encontrada' : 'Duplicatas Encontradas'}
                </span>
              </div>
              <button onClick={exportToCSV} className="btn-secondary">
                <Download className="icon-small" />
                Exportar CSV
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Ano</th>
                    <th>Downloads</th>
                    <th>Duplicado</th>
                    <th>Descrição</th>
                    <th>Palavra-Chave</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((app, index) => (
                    <tr key={index} className={app.isDuplicate ? 'row-duplicate' : ''}>
                      <td className="titulo-app"><a href={app.url} target="_blank" rel="noopener noreferrer">{app.title}</a></td>
                      <td><strong>{app.updatedYear}</strong></td>
                      <td>{app.installs}</td>
                      <td>
                        <span className={`badge ${app.isDuplicate ? 'badge-yes' : 'badge-no'}`}>
                          {app.isDuplicate ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="desc-cell">{app.summary ? app.summary : '-'}</td>
                      <td><span className="badge badge-keyword">{app.keywordOrigin}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}