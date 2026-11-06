import type { AppResult, AppSource, SearchMode, SearchResponse } from '../types';

/**
 * Critérios de inclusão (filtros), aplicados no cliente sobre a coleta — mudar um filtro não
 * exige nova busca na loja. Módulo puro (sem React): recebe a coleta e devolve incluídos,
 * excluídos com motivo e o funil, sempre conferido.
 */

export type PriceOption = 'all' | 'free' | 'paid';
export type PresenceOption = 'any' | 'without' | 'with';
export type MarketAge = 'any' | 'upTo1' | 'upTo2' | 'over2' | 'over5';

export interface Criteria {
  // Qualidade
  minScore: number; // nota como a loja exibe; 0 = qualquer
  minRatings: number; // nº mínimo de avaliações; 0 = qualquer
  // Alcance e maturidade
  minInstalls: number; // faixa mínima de downloads; 0 = qualquer
  updatedWithinMonths: number; // 0 = qualquer data
  marketAge: MarketAge; // tempo desde o lançamento
  // Modelo de negócio
  price: PriceOption;
  ads: PresenceOption;
  iap: PresenceOption;
  // Escopo
  categories: string[]; // genreIds selecionados; vazio = todas
  excludeGames: boolean;
  requireTermMatch: boolean; // modo palavra-chave
}

/** Todos os filtros desligados: a amostra começa igual à coleta. */
export const DEFAULT_CRITERIA: Criteria = {
  minScore: 0,
  minRatings: 0,
  minInstalls: 0,
  updatedWithinMonths: 0,
  marketAge: 'any',
  price: 'all',
  ads: 'any',
  iap: 'any',
  categories: [],
  excludeGames: false,
  requireTermMatch: false,
};

export interface Option<T> {
  value: T;
  label: string;
}

export const SCORE_OPTIONS: Option<number>[] = [
  { value: 0, label: 'Qualquer' },
  { value: 3, label: '3,0+' },
  { value: 3.5, label: '3,5+' },
  { value: 4, label: '4,0+' },
  { value: 4.5, label: '4,5+' },
];

export const RATINGS_OPTIONS: Option<number>[] = [
  { value: 0, label: 'Qualquer' },
  { value: 10, label: '10+' },
  { value: 100, label: '100+' },
  { value: 1_000, label: '1 mil+' },
  { value: 10_000, label: '10 mil+' },
  { value: 100_000, label: '100 mil+' },
];

export const INSTALLS_OPTIONS: Option<number>[] = [
  { value: 0, label: 'Qualquer' },
  { value: 1_000, label: '1 mil+' },
  { value: 10_000, label: '10 mil+' },
  { value: 100_000, label: '100 mil+' },
  { value: 1_000_000, label: '1 mi+' },
  { value: 10_000_000, label: '10 mi+' },
  { value: 100_000_000, label: '100 mi+' },
];

export const UPDATED_OPTIONS: Option<number>[] = [
  { value: 0, label: 'Qualquer data' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Último ano' },
  { value: 24, label: 'Últimos 2 anos' },
  { value: 36, label: 'Últimos 3 anos' },
];

export const MARKET_AGE_OPTIONS: Option<MarketAge>[] = [
  { value: 'any', label: 'Qualquer' },
  { value: 'upTo1', label: 'Lançados no último ano' },
  { value: 'upTo2', label: 'Lançados nos últimos 2 anos' },
  { value: 'over2', label: 'No mercado há mais de 2 anos' },
  { value: 'over5', label: 'No mercado há mais de 5 anos' },
];

export const PRICE_OPTIONS: Option<PriceOption>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'free', label: 'Gratuitos' },
  { value: 'paid', label: 'Pagos' },
];

export const PRESENCE_OPTIONS: Option<PresenceOption>[] = [
  { value: 'any', label: 'Indiferente' },
  { value: 'without', label: 'Sem' },
  { value: 'with', label: 'Com' },
];

/** Motivos de exclusão, na ordem em que são avaliados (cada app conta só no primeiro). */
export const EXCLUSION_ORDER = [
  'failed',
  'category',
  'games',
  'price',
  'ads',
  'iap',
  'noTermMatch',
  'unrated',
  'score',
  'ratings',
  'installs',
  'outdated',
  'marketAge',
] as const;

export type ExclusionReason = (typeof EXCLUSION_ORDER)[number];
export type ExclusionStats = Record<ExclusionReason, number>;

export const REASON_LABELS: Record<ExclusionReason, string> = {
  failed: 'falha de leitura',
  category: 'fora das categorias',
  games: 'jogos',
  price: 'preço',
  ads: 'anúncios',
  iap: 'compras no app',
  noTermMatch: 'não citam o termo',
  unrated: 'sem avaliações',
  score: 'nota abaixo do mínimo',
  ratings: 'poucas avaliações',
  installs: 'poucos downloads',
  outdated: 'desatualizados',
  marketAge: 'tempo de mercado',
};

export interface ExcludedApp {
  appId: string;
  title: string;
  url: string;
  sources: AppSource[];
  reason: ExclusionReason;
  detail: string; // explicação legível, ex.: "Nota 3,2 abaixo do mínimo 4,0."
  app: AppResult | null; // null = a página do app não pôde ser lida
}

export interface Analysis {
  included: AppResult[];
  excluded: ExcludedApp[];
  stats: ExclusionStats;
  excludedTotal: number;
}

export interface CategoryOption {
  genreId: string;
  genre: string;
  count: number;
}

const fmtDecimal = (n: number) => n.toFixed(1).replace('.', ',');
const fmtInt = (n: number) => n.toLocaleString('pt-BR');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
// Data de lançamento é uma data de calendário (meia-noite UTC): formatar em UTC evita mostrar o dia anterior.
const fmtCalendarDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const parseShownScore = (text: string): number | null => {
  const n = Number(text.replace(',', '.'));
  return text && Number.isFinite(n) && n > 0 ? n : null;
};
const isGame = (genreId: string) => genreId.toUpperCase().startsWith('GAME');
const optionLabel = <T,>(options: Option<T>[], value: T) => options.find((o) => o.value === value)?.label ?? String(value);

const monthsBefore = (now: number, months: number): number => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.getTime();
};

/** Quantos filtros estão ligados (diferentes do padrão). */
export function countActive(c: Criteria): number {
  return (Object.keys(DEFAULT_CRITERIA) as (keyof Criteria)[]).filter((key) =>
    key === 'categories' ? c.categories.length > 0 : c[key] !== DEFAULT_CRITERIA[key]
  ).length;
}

/** Categorias presentes na coleta, da mais frequente para a menos. */
export function categoryOptions(apps: AppResult[]): CategoryOption[] {
  const byId = new Map<string, CategoryOption>();
  for (const a of apps) {
    const key = a.genreId || a.genre;
    const entry = byId.get(key) ?? { genreId: key, genre: a.genre || key, count: 0 };
    entry.count++;
    byId.set(key, entry);
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre, 'pt-BR'));
}

/** Primeiro critério que exclui o app, ou null se ele passa em todos. */
function exclusionFor(a: AppResult, c: Criteria, mode: SearchMode, now: number): { reason: ExclusionReason; detail: string } | null {
  if (c.categories.length > 0 && !c.categories.includes(a.genreId || a.genre)) {
    return { reason: 'category', detail: `Categoria "${a.genre}" fora das categorias selecionadas.` };
  }
  if (c.excludeGames && isGame(a.genreId)) {
    return { reason: 'games', detail: `Jogo (categoria "${a.genre}").` };
  }
  if (c.price === 'free' && !a.free) {
    return { reason: 'price', detail: `App pago (${a.priceText || 'preço não informado'}); filtro: somente gratuitos.` };
  }
  if (c.price === 'paid' && a.free) {
    return { reason: 'price', detail: 'App gratuito; filtro: somente pagos.' };
  }
  if (c.ads === 'without' && a.adSupported) {
    return { reason: 'ads', detail: 'Contém anúncios; filtro: somente sem anúncios.' };
  }
  if (c.ads === 'with' && !a.adSupported) {
    return { reason: 'ads', detail: 'Não contém anúncios; filtro: somente com anúncios.' };
  }
  if (c.iap === 'without' && a.offersIAP) {
    return { reason: 'iap', detail: `Oferece compras no app${a.iapRange ? ` (${a.iapRange})` : ''}; filtro: somente sem compras.` };
  }
  if (c.iap === 'with' && !a.offersIAP) {
    return { reason: 'iap', detail: 'Não oferece compras no app; filtro: somente com compras.' };
  }
  if (mode === 'keyword' && c.requireTermMatch && a.termMatches.length === 0) {
    return { reason: 'noTermMatch', detail: 'Nenhum termo pesquisado aparece no título, no resumo ou na descrição.' };
  }
  const shown = parseShownScore(a.scoreText);
  if ((c.minScore > 0 || c.minRatings > 0) && shown === null) {
    return { reason: 'unrated', detail: 'Sem avaliações na loja; há filtro de nota ou de nº de avaliações.' };
  }
  if (c.minScore > 0 && shown !== null && shown < c.minScore) {
    return { reason: 'score', detail: `Nota ${a.scoreText} abaixo do mínimo ${fmtDecimal(c.minScore)}.` };
  }
  if (c.minRatings > 0 && a.ratings < c.minRatings) {
    return { reason: 'ratings', detail: `${fmtInt(a.ratings)} avaliações; mínimo ${fmtInt(c.minRatings)}.` };
  }
  if (c.minInstalls > 0 && a.minInstalls < c.minInstalls) {
    return { reason: 'installs', detail: `${a.installs || 'Downloads não informados'}; mínimo ${fmtInt(c.minInstalls)}+.` };
  }
  if (c.updatedWithinMonths > 0) {
    const updated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    if (!updated) return { reason: 'outdated', detail: 'A loja não informa a data da última atualização.' };
    if (updated < monthsBefore(now, c.updatedWithinMonths)) {
      return {
        reason: 'outdated',
        detail: `Última atualização em ${fmtDate(a.updatedAt)}; filtro: ${optionLabel(UPDATED_OPTIONS, c.updatedWithinMonths).toLowerCase()}.`,
      };
    }
  }
  if (c.marketAge !== 'any') {
    if (!a.releasedAt) return { reason: 'marketAge', detail: 'A loja não informa a data de lançamento.' };
    const released = new Date(a.releasedAt).getTime();
    const ok = {
      upTo1: released >= monthsBefore(now, 12),
      upTo2: released >= monthsBefore(now, 24),
      over2: released < monthsBefore(now, 24),
      over5: released < monthsBefore(now, 60),
    }[c.marketAge];
    if (!ok) {
      return {
        reason: 'marketAge',
        detail: `Lançado em ${fmtCalendarDate(a.releasedAt)}; filtro: ${optionLabel(MARKET_AGE_OPTIONS, c.marketAge).toLowerCase()}.`,
      };
    }
  }
  return null;
}

export function applyCriteria(response: SearchResponse, c: Criteria, now = Date.now()): Analysis {
  const stats = Object.fromEntries(EXCLUSION_ORDER.map((r) => [r, 0])) as ExclusionStats;
  const included: AppResult[] = [];
  const excluded: ExcludedApp[] = [];

  // Apps cuja página não pôde ser lida nunca somem: entram como excluídos com o motivo.
  for (const f of response.failedApps) {
    stats.failed++;
    excluded.push({ appId: f.appId, title: f.title, url: f.url, sources: f.sources, reason: 'failed', detail: f.detail, app: null });
  }
  for (const a of response.apps) {
    const exclusion = exclusionFor(a, c, response.mode, now);
    if (!exclusion) {
      included.push(a);
      continue;
    }
    stats[exclusion.reason]++;
    excluded.push({ appId: a.appId, title: a.title, url: a.url, sources: a.sources, ...exclusion, app: a });
  }

  const excludedTotal = excluded.length;
  // Invariante: todo app único termina incluído ou excluído com motivo.
  if (included.length + excludedTotal !== response.funnel.unique) {
    throw new Error(`Contagem inconsistente: ${response.funnel.unique} únicos ≠ ${included.length} + ${excludedTotal}`);
  }
  excluded.sort((a, b) => EXCLUSION_ORDER.indexOf(a.reason) - EXCLUSION_ORDER.indexOf(b.reason));
  return { included, excluded, stats, excludedTotal };
}

/** Critérios ativos em texto (para a auditoria). */
export function describeCriteria(c: Criteria, mode: SearchMode, categoryName: (genreId: string) => string): string[] {
  const parts: string[] = [];
  if (c.minScore > 0) parts.push(`nota mínima ${fmtDecimal(c.minScore)} (como exibida na loja)`);
  if (c.minRatings > 0) parts.push(`mínimo de ${fmtInt(c.minRatings)} avaliações`);
  if (c.minInstalls > 0) parts.push(`mínimo de ${fmtInt(c.minInstalls)} downloads`);
  if (c.updatedWithinMonths > 0) parts.push(`atualizados: ${optionLabel(UPDATED_OPTIONS, c.updatedWithinMonths).toLowerCase()}`);
  if (c.marketAge !== 'any') parts.push(optionLabel(MARKET_AGE_OPTIONS, c.marketAge).toLowerCase());
  if (c.price !== 'all') parts.push(c.price === 'free' ? 'somente gratuitos' : 'somente pagos');
  if (c.ads !== 'any') parts.push(c.ads === 'without' ? 'sem anúncios' : 'com anúncios');
  if (c.iap !== 'any') parts.push(c.iap === 'without' ? 'sem compras no app' : 'com compras no app');
  if (c.categories.length > 0) parts.push(`categorias: ${c.categories.map(categoryName).join(', ')}`);
  if (c.excludeGames) parts.push('sem jogos');
  if (mode === 'keyword' && c.requireTermMatch) parts.push('somente apps que citam um termo pesquisado');
  return parts;
}
