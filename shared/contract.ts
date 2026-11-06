/**
 * Contrato HTTP entre a API e o frontend — fonte única da verdade.
 * Só tipos: é apagado na compilação, então não vira código em produção.
 * Importado por api/src/types.ts e app/src/types.ts.
 *
 * Divisão de responsabilidades:
 *  - A API faz a COLETA: lista completa da loja + leitura da página de cada app.
 *  - O frontend aplica os CRITÉRIOS (filtros) sobre a coleta, na hora — ver app/src/lib/criteria.ts.
 */

export type SearchMode = 'keyword' | 'similar';

/** Loja consultada. O idioma define em que língua vêm os textos (e a evidência de citação). */
export interface StoreLocale {
    country: string; // ex.: "br"
    lang: string; // ex.: "pt"
}

export interface KeywordSearchRequest extends StoreLocale {
    terms: string[];
}

export interface SimilarSearchRequest extends StoreLocale {
    app: string; // URL da Play Store ou ID do app
}

/** Lista da loja em que o app apareceu, e em que posição — permite conferir na própria loja. */
export interface AppSource {
    query: string; // termo pesquisado (palavra-chave) ou título do app informado (concorrente)
    position: number; // melhor posição observada nas consultas (1 = primeiro resultado)
}

export type TextField = 'title' | 'summary' | 'description';

/** Termo pesquisado citado no texto do app, e o primeiro campo em que aparece. */
export interface TermMatch {
    term: string;
    field: TextField;
}

/** Dados de um app, lidos da página dele na Play Store. */
export interface AppResult {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    /** Nota exatamente como a loja exibe (ex.: "4,1"). '' = sem avaliações. */
    scoreText: string;
    /** Nota com todas as casas decimais. null = sem avaliações. */
    score: number | null;
    ratings: number;
    /** Faixa de downloads exibida pela loja (ex.: "1.000.000+"). */
    installs: string;
    minInstalls: number;
    updatedAt: string; // ISO; '' se a loja não informa
    releasedAt: string; // ISO; '' se a loja não informa
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
    adSupported: boolean; // "Contém anúncios"
    offersIAP: boolean; // "Compras no app"
    iapRange: string; // faixa de preço das compras no app, quando houver
    contentRating: string; // classificação indicativa
    sources: AppSource[];
    /** Modo palavra-chave: termos pesquisados citados no texto do app (vazio = nenhum). */
    termMatches: TermMatch[];
    fetchedAt: string; // ISO: quando a página do app foi lida na loja
}

/** App encontrado na lista da loja cuja página não pôde ser lida. */
export interface FailedApp {
    appId: string;
    title: string;
    url: string;
    sources: AppSource[];
    detail: string;
}

/** Quantos apps cada lista da loja retornou. */
export interface QueryCount {
    query: string;
    /** Apps distintos na união de todas as consultas a esta lista. */
    found: number;
    /** A loja exibe no máximo `storeLimit` apps por busca; true = este termo atingiu o limite. */
    reachedStoreLimit: boolean;
    /** Quantas vezes a lista foi consultada até estabilizar (a loja pode variar entre consultas idênticas). */
    passes: number;
    /** Apps que apareceram só em parte das consultas (0 = lista estável). */
    intermittent: number;
}

/** Contagens da coleta. Sempre vale: unique = read + failed. */
export interface CollectionFunnel {
    identified: number; // soma dos apps de todas as listas
    duplicates: number; // repetições entre listas
    unique: number;
    read: number; // páginas lidas com sucesso
    failed: number;
}

/** App informado no modo concorrente. */
export interface SeedInfo {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    genre: string;
    genreId: string;
    url: string;
}

export interface CollectionInfo extends StoreLocale {
    terms: string[]; // modo palavra-chave
    app: string; // modo concorrente: ID do app informado
    storeLimit: number;
}

export interface SearchResponse {
    mode: SearchMode;
    collection: CollectionInfo;
    collectedAt: string; // ISO: fim da coleta
    queries: QueryCount[];
    funnel: CollectionFunnel;
    seed?: SeedInfo;
    /** Ressalvas da coleta (limite da loja, lista instável, falhas de leitura...). */
    notices: string[];
    /** Todos os apps lidos, na ordem de relevância da loja. Os critérios são aplicados no cliente. */
    apps: AppResult[];
    failedApps: FailedApp[];
}

// ---------------------------------------------------------------------------
// Coletas rodam em segundo plano: POST devolve um jobId e o cliente consulta o andamento.
// ---------------------------------------------------------------------------

export type JobPhase = 'queued' | 'search' | 'details' | 'retry' | 'done';

export interface JobProgress {
    phase: JobPhase;
    done: number;
    total: number;
    message: string;
}

/** Resposta 202 de POST /api/search e POST /api/similar. */
export interface JobAccepted {
    jobId: string;
}

/** Resposta de GET /api/jobs/:jobId. */
export interface JobState {
    jobId: string;
    status: 'running' | 'done' | 'error';
    progress: JobProgress;
    result?: SearchResponse;
    error?: string;
}

export interface ErrorResponse {
    error: string;
}
