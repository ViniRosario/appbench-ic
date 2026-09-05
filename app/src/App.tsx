import { useState } from 'react';
import axios from 'axios';
import { Search, Download, Loader2, Smartphone } from 'lucide-react';
import './App.css';

interface AppData {
  title: string;
  developer: string;
  score: string | number;
  free: boolean;
  summary: string; // Nova propriedade
  keywordOrigin: string;
  url: string;
}

export default function App() {
  const [terms, setTerms] = useState('pré-natal, gestante');
  const [results, setResults] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!terms.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);

    const termsArray = terms.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await axios.post('http://localhost:3333/api/search', {
        terms: termsArray,
      });
      setResults(response.data.data);
    } catch (err) {
      setError('Erro ao buscar dados. Verifique se a API está rodando no terminal.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    
    // Mudança para ponto e vírgula (Padrão do Excel no Brasil)
    const headers = ['Título;Desenvolvedor;Nota;Gratuito;Palavra-Chave;Descrição;Link\n'];
    
    const rows = results.map(app => {
      // Limpa quebras de linha e aspas da descrição para não quebrar o Excel
      const cleanSummary = app.summary ? app.summary.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""') : 'Sem descrição';
      return `"${app.title}";"${app.developer}";"${app.score}";"${app.free ? 'Sim' : 'Não'}";"${app.keywordOrigin}";"${cleanSummary}";"${app.url}"`;
    });
    
    const csvContent = headers.concat(rows).join('\n');
    // Adiciona o caractere \uFEFF (BOM) para forçar o Excel a ler os acentos (UTF-8) corretamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'benchmarking_apps.csv');
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
        <p>Extrator metodológico para benchmarking de aplicativos na Play Store</p>
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
            />
            <button onClick={handleSearch} disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="spin icon-small" /> : <Search className="icon-small" />}
              {loading ? 'Buscando...' : 'Pesquisar'}
            </button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>

        {results.length > 0 && (
          <div className="results-card">
            <div className="results-header">
              <h2 className="title-destaque">{results.length} Aplicativos Encontrados</h2>
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
                    <th>Desenvolvedor</th>
                    <th>Descrição</th>
                    <th>Nota</th>
                    <th>Gratuito</th>
                    <th>Palavra-Chave</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((app, index) => (
                    <tr key={index}>
                      <td className="titulo-app"><a href={app.url} target="_blank" rel="noopener noreferrer">{app.title}</a></td>
                      <td>{app.developer}</td>
                      <td className="desc-cell">{app.summary ? app.summary : '-'}</td>
                      <td>{app.score !== 'Sem Avaliação' ? Number(app.score).toFixed(1) : '-'}</td>
                      <td>{app.free ? 'Sim' : 'Não'}</td>
                      <td><span className="badge">{app.keywordOrigin}</span></td>
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