export interface AppData {
  appId: string;
  title: string;
  developer: string;
  score: string | number;
  free: boolean;
  summary: string;
  keywordOrigin: string;
  url: string;
  isDuplicate: boolean;
  installs: string | null;
  minInstalls: number | null;
  ratings: number | null;
  genreId: string | null;
  updatedYear: number | null;
  detailsFailed: boolean;
}

export interface Funnel {
  rawHits: number;
  uniqueApps: number;
  duplicatesMerged: number;
  noScore: number;
  belowMinScore: number;
  passedScoreFilter: number;
  notFree: number;
  detailsFailed: number;
  finalSample: number;
}

export interface SearchLog {
  term: string;
  country: string;
  lang: string;
  requested: number;
  returned: number;
  error?: string;
}

export interface SearchMeta {
  collectedAt: string;
  minScore: number;
  onlyFree: boolean;
  requestedPerSearch: number;
  regions: { country: string; lang: string }[];
  terms: string[];
}

export interface SearchResponse {
  data: AppData[];
  duplicatedCount: number;
  funnel: Funnel | null;
  searches: SearchLog[];
  meta: SearchMeta | null;
}

// Filtros escolhidos pelo usuário na tela
export interface Filters {
  minScore: number;
  limit: number;
  onlyFree: boolean;
  regionKeys: string[];
}

export const REGION_OPTIONS = [
  { key: 'br', label: 'Brasil (pt)', country: 'br', lang: 'pt' },
  { key: 'us', label: 'EUA (en)', country: 'us', lang: 'en' },
  { key: 'es', label: 'Espanha (es)', country: 'es', lang: 'es' },
  { key: 'fr', label: 'França (fr)', country: 'fr', lang: 'fr' },
];

export const DEFAULT_FILTERS: Filters = {
  minScore: 4,
  limit: 100,
  onlyFree: false,
  regionKeys: ['br'],
};