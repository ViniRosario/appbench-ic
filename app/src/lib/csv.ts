import type { AppResult, SearchResponse } from '../types';
import { describeCriteria, REASON_LABELS } from './criteria';
import type { Analysis, Criteria, ExcludedApp } from './criteria';
import { formatCalendarDate, formatDate, formatDateTime, formatSources, formatTermMatches } from './format';
import { marketLabel } from './markets';

/**
 * Exportações em CSV (UTF-8 com BOM, separador ";") compatíveis com o Excel em pt-BR.
 * Ambas refletem os filtros aplicados na tela no momento da exportação.
 *  - Amostra: só os apps incluídos, em tabela pura para análise.
 *  - Auditoria: todos os apps da coleta (incluídos e excluídos, com motivo), a coleta e os critérios.
 */

type Cell = string | number;

const cell = (value: Cell): string => `"${String(value).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`;
const row = (values: Cell[]): string => values.map(cell).join(';');
const decimal = (n: number): string => String(n).replace('.', ',');
const yesNo = (v: boolean): string => (v ? 'Sim' : 'Não');

function appColumns(response: SearchResponse): { header: string[]; values: (a: AppResult | null) => Cell[] } {
  const keyword = response.mode === 'keyword';
  const header = [
    'Título',
    'Desenvolvedor',
    'Categoria',
    'Nota (como exibida na loja)',
    'Nota (exata)',
    'Avaliações',
    'Downloads (faixa da loja)',
    'Downloads (mínimo)',
    'Última atualização',
    'Lançamento',
    'Preço',
    'Contém anúncios',
    'Compras no app',
    'Faixa das compras no app',
    'Classificação indicativa',
    keyword ? 'Encontrado por (posição na busca)' : 'Posição em "Apps semelhantes"',
    ...(keyword ? ['Nº de termos', 'Termos citados no texto (campo)'] : []),
    'Resumo',
    'ID',
    'Link',
    'Lido na loja em',
  ];
  const values = (a: AppResult | null): Cell[] =>
    a
      ? [
          a.title,
          a.developer,
          a.genre,
          a.scoreText || 'Sem avaliações',
          a.score === null ? '' : decimal(a.score),
          a.ratings,
          a.installs,
          a.minInstalls,
          formatDate(a.updatedAt),
          formatCalendarDate(a.releasedAt),
          a.free ? 'Gratuito' : a.priceText,
          yesNo(a.adSupported),
          yesNo(a.offersIAP),
          a.iapRange,
          a.contentRating,
          keyword ? formatSources(a.sources) : `#${a.sources[0]?.position ?? ''}`,
          ...(keyword ? [a.sources.length, formatTermMatches(a.termMatches) || 'Nenhum'] : []),
          a.summary,
          a.appId,
          a.url,
          formatDateTime(a.fetchedAt),
        ]
      : header.map(() => '');
  return { header, values };
}

function download(lines: string[], response: SearchResponse, suffix: string): void {
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appbench_${response.mode}_${response.collectedAt.slice(0, 10)}_${suffix}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Apps incluídos na amostra final (com os filtros da tela). */
export function exportSample(response: SearchResponse, analysis: Analysis): void {
  if (analysis.included.length === 0) return;
  const { header, values } = appColumns(response);
  download([row(['Ordem', ...header]), ...analysis.included.map((a, i) => row([i + 1, ...values(a)]))], response, 'amostra');
}

function headerLines(response: SearchResponse, analysis: Analysis, criteria: Criteria): string[] {
  const { collection, funnel, queries } = response;
  const categoryName = (id: string) => response.apps.find((a) => (a.genreId || a.genre) === id)?.genre ?? id;
  const active = describeCriteria(criteria, response.mode, categoryName);
  return [
    row(['AppBench — auditoria da coleta']),
    row(['Coletado em', formatDateTime(response.collectedAt)]),
    row(['Exportado em', formatDateTime(new Date().toISOString())]),
    row(['Loja', `Google Play — ${marketLabel(collection.country)} (país ${collection.country.toUpperCase()}, idioma ${collection.lang})`]),
    response.mode === 'keyword'
      ? row(['Termos pesquisados', collection.terms.join(' | ')])
      : row(['App informado', `${response.seed?.title ?? ''} (${collection.app})`]),
    row([
      'Apps por lista da loja',
      queries
        .map(
          (q) =>
            `${q.query}: ${q.found} (${q.passes} consultas` +
            `${q.intermittent > 0 ? `; ${q.intermittent} apareceram só em parte delas` : '; lista estável'}` +
            `${q.reachedStoreLimit ? `; limite de ${collection.storeLimit} da loja` : ''})`
        )
        .join(' | '),
    ]),
    row(['Filtros aplicados', active.length > 0 ? active.join('; ') : 'nenhum']),
    row([
      'Funil',
      `${funnel.identified} identificados; ${funnel.duplicates} repetidos; ${funnel.unique} únicos = ` +
        `${analysis.included.length} incluídos + ${analysis.excludedTotal} excluídos`,
    ]),
    ...response.notices.map((n) => row(['Observação', n])),
    '',
  ];
}

/** Todos os apps da coleta, com status e motivo de exclusão — permite conferir cada número. */
export function exportAudit(response: SearchResponse, analysis: Analysis, criteria: Criteria): void {
  const { header, values } = appColumns(response);
  // App que não pôde ser lido: só o que veio da lista da loja (título, ID e link).
  const unreadValues = (e: ExcludedApp): Cell[] => {
    const v = values(null);
    v[header.indexOf('Título')] = e.title;
    v[header.indexOf('ID')] = e.appId;
    v[header.indexOf('Link')] = e.url;
    return v;
  };
  const included = analysis.included.map((a) => row(['Incluído', '', '', ...values(a)]));
  const excluded = analysis.excluded.map((e) =>
    row(['Excluído', REASON_LABELS[e.reason], e.detail, ...(e.app ? values(e.app) : unreadValues(e))])
  );
  download(
    [...headerLines(response, analysis, criteria), row(['Status', 'Motivo', 'Detalhe', ...header]), ...included, ...excluded],
    response,
    'auditoria'
  );
}
