import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, startKeywordSearch, startSimilarSearch, waitForJob } from '../lib/api';
import { applyCriteria, DEFAULT_CRITERIA } from '../lib/criteria';
import type { Criteria } from '../lib/criteria';
import { DEFAULT_MARKET } from '../lib/markets';
import type { Market } from '../lib/markets';
import type { JobProgress, SearchMode, SearchResponse } from '../types';

const parseTerms = (value: string): string[] =>
  value.split(',').map((t) => t.trim()).filter(Boolean);

/**
 * Estado da tela, em duas partes independentes:
 *  - coleta (modo, consulta, loja): muda o que é buscado na Play Store e exige nova busca;
 *  - critérios (filtros): aplicados na hora sobre a coleta, sem nova busca.
 */
export function useAppSearch() {
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<Market>(DEFAULT_MARKET);
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analysis = useMemo(() => (response ? applyCriteria(response, criteria) : null), [response, criteria]);

  // Identifica a busca atual: respostas de buscas antigas (ou após sair da tela) são ignoradas.
  const runRef = useRef(0);
  useEffect(
    () => () => {
      runRef.current++;
    },
    []
  );

  const changeMode = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery('');
    setError('');
  };

  const resetCriteria = () => setCriteria(DEFAULT_CRITERIA);

  const search = async () => {
    const value = query.trim();
    if (!value) return;

    const run = ++runRef.current;
    const isCurrent = () => runRef.current === run;
    const locale = { country: market.country, lang: market.lang };

    setLoading(true);
    setError('');
    setResponse(null);
    setProgress(null);

    try {
      const jobId =
        mode === 'keyword' ? await startKeywordSearch(parseTerms(value), locale) : await startSimilarSearch(value, locale);
      const result = await waitForJob(
        jobId,
        (p) => {
          if (isCurrent()) setProgress(p);
        },
        () => !isCurrent()
      );
      if (result && isCurrent()) {
        // Categorias selecionadas de uma coleta anterior podem não existir nesta.
        setCriteria((c) => ({ ...c, categories: c.categories.filter((id) => result.apps.some((a) => (a.genreId || a.genre) === id)) }));
        setResponse(result);
      }
    } catch (err) {
      if (isCurrent()) {
        setError(getErrorMessage(err));
        console.error(err);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setProgress(null);
      }
    }
  };

  return {
    mode,
    changeMode,
    query,
    setQuery,
    market,
    setMarket,
    criteria,
    setCriteria,
    resetCriteria,
    response,
    analysis,
    progress,
    loading,
    error,
    search,
  };
}
