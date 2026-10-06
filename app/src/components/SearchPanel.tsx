import { Search, Loader2 } from 'lucide-react';

const MATRICES = [
  { label: 'Gestação (7 termos)', terms: 'gestante, gravidez, pregnant, pregnancy, embarazada, embarazo, grossesse' },
  { label: 'Pré-natal (6 termos)', terms: 'pré-natal, prenatal care, prenatal, atención prenatal, cuidados prenatales, soins prénatals' },
  { label: 'Saúde materna (6 termos)', terms: "saúde da mulher, saúde materna, maternal health, women's health, salud materna, salud de la mujer" },
];

interface Props {
  terms: string;
  setTerms: (v: string) => void;
  loading: boolean;
  error: string;
  onSearch: (override?: string) => void;
}

export default function SearchPanel({ terms, setTerms, loading, error, onSearch }: Props) {
  return (
    <section className="search">
      <label htmlFor="search" className="search-label">Quais termos você quer pesquisar?</label>
      <div className="search-row">
        <input
          id="search"
          type="text"
          value={terms}
          onChange={e => setTerms(e.target.value)}
          placeholder="Separe por vírgula. Ex: pré-natal, gestante, saúde da mulher"
          onKeyDown={e => e.key === 'Enter' && onSearch()}
        />
        <button onClick={() => onSearch()} disabled={loading} className="btn btn-primary">
          {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
          {loading ? 'Pesquisando' : 'Pesquisar'}
        </button>
      </div>

      <div className="chips">
        <span className="chips-label">Conjuntos prontos, em vários idiomas:</span>
        {MATRICES.map(m => (
          <button key={m.label} onClick={() => onSearch(m.terms)} className="chip" disabled={loading}>{m.label}</button>
        ))}
      </div>

      {loading && (
        <p className="notice">
          A busca pode levar alguns minutos. Se o servidor estava parado, ele precisa de cerca de 1 minuto para ligar.
        </p>
      )}
      {error && <p className="notice notice-error">{error}</p>}
    </section>
  );
}
