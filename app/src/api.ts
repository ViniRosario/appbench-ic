import axios from 'axios';
import { REGION_OPTIONS } from './types';
import type { Filters, SearchResponse } from './types';

// Em desenvolvimento (npm run dev) usa a API local; no site publicado usa a da Render.
const API_URL = import.meta.env.DEV
  ? 'http://localhost:3333/api/search'
  : 'https://api-appbench.onrender.com/api/search';

export async function searchApps(terms: string[], filters: Filters): Promise<SearchResponse> {
  const regions = REGION_OPTIONS
    .filter(r => filters.regionKeys.includes(r.key))
    .map(({ country, lang }) => ({ country, lang }));

  const { data } = await axios.post(
    API_URL,
    {
      terms,
      limit: filters.limit,
      regions,
      filters: { minScore: filters.minScore, onlyFree: filters.onlyFree },
    },
    { timeout: 5 * 60 * 1000 }
  );

  return {
    data: data.data,
    duplicatedCount: data.duplicatedCount,
    funnel: data.funnel ?? null,
    searches: data.searches ?? [],
    meta: data.meta ?? null,
  };
}