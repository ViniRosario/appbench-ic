export type SearchMode = 'keyword' | 'similar';
export type PriceFilter = 'all' | 'free' | 'paid';

export interface Filters {
  minScore: number;
  minInstalls: number;
  recentOnly: boolean;
  excludeGames: boolean;
  price: PriceFilter;
}

export interface AppData {
  appId: string;
  title: string;
  developer: string;
  icon: string;
  summary: string;
  url: string;
  score: number;
  ratings: number;
  installs: string;
  minInstalls: number;
  updatedAt: string;
  updatedYear: number;
  genre: string;
  genreId: string;
  free: boolean;
  price: number;
  priceText: string;
  keywordOrigin: string;
  matchedTerms: number;
  isDuplicate: boolean;
}

export interface ExclusionStats {
  score: number;
  installs: number;
  outdated: number;
  games: number;
  price: number;
  offTopic: number;
  failed: number;
}

export interface SeedInfo {
  appId: string;
  title: string;
  developer: string;
  icon: string;
  genre: string;
  url: string;
}

export interface SearchResponse {
  mode: SearchMode;
  total: number;
  scanned: number;
  duplicatedCount: number;
  excludedGames: number;
  failedDetails: number;
  excluded: ExclusionStats;
  seed?: SeedInfo;
  data: AppData[];
}
