import type { AppSource, StoreLocale } from '../../shared/contract.js';

export type * from '../../shared/contract.js';

/** App encontrado nas listas da loja (dados rasos, antes de ler a página do app). */
export interface Candidate {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    sources: AppSource[];
}

/** Metadados lidos da página do app na Play Store. */
export interface AppDetails {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    description: string;
    url: string;
    score: number | null;
    scoreText: string;
    ratings: number;
    installs: string;
    minInstalls: number;
    updated: number; // timestamp (ms); 0 se a loja não informa
    released: string; // ISO; '' se a loja não informa
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
    adSupported: boolean;
    offersIAP: boolean;
    iapRange: string;
    contentRating: string;
    fetchedAt: string;
}

export type Locale = StoreLocale;
