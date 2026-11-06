import type { SearchFilters } from '../../shared/contract.js';

export type {
    AppResult,
    ExclusionStats,
    PriceFilter,
    SearchMode,
    SearchResponse,
    SeedInfo,
} from '../../shared/contract.js';

/** Filtros já validados, com o idioma/país usados na Play Store. */
export interface Filters extends SearchFilters {
    lang: string;
    country: string;
}

/** App encontrado na fase de varredura (dados rasos, antes do deep fetch). */
export interface Candidate {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    sources: string[]; // termos (modo keyword) ou apps de origem (modo similar)
    bestRank: number;
}

/** Metadados reais extraídos da página do app. */
export interface AppDetails {
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
    updated: number;
    released: string;
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
}
