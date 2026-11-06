import { useState } from 'react';
import { getErrorMessage, searchByKeywords, searchSimilar } from '../lib/api';
import type { Filters, SearchMode, SearchResponse } from '../types';

const DEFAULT_FILTERS: Filters = {
  minScore: 4,
  minInstalls: 0,
  recentOnly: false,
  excludeGames: true,
  price: 'all',
};

const parseTerms = (value: string): string[] =>
  value.split(',').map((t) => t.trim()).filter(Boolean);

/** Estado e ações da busca: modo, texto digitado, filtros e o ciclo requisição → resultado/erro. */
export function useAppSearch() {
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const changeMode = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery('');
    setError('');
  };

  const search = async () => {
    const value = query.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result =
        mode === 'keyword' ? await searchByKeywords(parseTerms(value), filters) : await searchSimilar(value, filters);
      setResponse(result);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { mode, changeMode, query, setQuery, filters, setFilters, response, loading, error, search };
}
