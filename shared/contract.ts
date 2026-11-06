/**
 * Contrato HTTP entre a API e o frontend — fonte única da verdade.
 * Só tipos: é apagado na compilação, então não vira código em produção.
 * Importado por api/src/types.ts e app/src/types.ts.
 */

export type SearchMode = 'keyword' | 'similar';
export type PriceFilter = 'all' | 'free' | 'paid';

/** Filtros enviados no corpo de POST /api/search e POST /api/similar. */
export interface SearchFilters {
    minScore: number; // 0 = sem filtro
    minInstalls: number; // 0 = sem filtro
    recentOnly: boolean; // exclui apps sem atualização nos últimos anos (RECENT_YEARS na API)
    excludeGames: boolean;
    price: PriceFilter;
}

export interface KeywordSearchRequest extends SearchFilters {
    terms: string[];
    limit?: number;
}

export interface SimilarSearchRequest extends SearchFilters {
    app: string; // URL da Play Store ou ID do app
}

export interface AppResult {
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
    updatedAt: string; // ISO; '' se desconhecido
    updatedYear: number;
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
    /** Termos (modo keyword) ou apps de origem (modo similar) em que o app apareceu. */
    sources: string[];
    /** Modo keyword: o app apareceu em mais de um termo. */
    isDuplicate: boolean;
}

/** Quantos apps cada filtro removeu (cada app conta só no 1º motivo). */
export interface ExclusionStats {
    score: number;
    installs: number;
    outdated: number;
    games: number;
    price: number;
    offTopic: number; // modo similar: concorrentes indiretos de outra categoria
    failed: number; // não foi possível ler os detalhes do app
}

/** App informado no modo similar. */
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
    excluded: ExclusionStats;
    seed?: SeedInfo;
    data: AppResult[];
}

export interface ErrorResponse {
    error: string;
}
