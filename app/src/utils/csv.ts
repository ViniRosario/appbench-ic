import type { AppData, Funnel, SearchLog, SearchMeta } from '../types';

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`;
};

const line = (cells: unknown[]) => cells.map(csvCell).join(';');

// CSV com BOM UTF-8 e ponto e vírgula: abre limpo no Excel
const downloadCSV = (filename: string, lines: string[]) => {
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function exportResultsCSV(results: AppData[], meta: SearchMeta | null) {
  if (results.length === 0) return;
  const header = line([
    'Título', 'Desenvolvedor', 'Ano', 'Downloads (faixa)', 'Downloads (mínimo)', 'Avaliações',
    'Categoria', 'Duplicado', 'Nota', 'Gratuito', 'Palavra-Chave', 'Descrição', 'Link',
    'Detalhes incompletos', 'Data da coleta',
  ]);
  const rows = results.map(a =>
    line([
      a.title, a.developer, a.updatedYear, a.installs, a.minInstalls, a.ratings, a.genreId,
      a.isDuplicate ? 'Sim' : 'Não', a.score, a.free ? 'Sim' : 'Não', a.keywordOrigin,
      a.summary || 'Sem descrição', a.url, a.detailsFailed ? 'Sim' : 'Não', meta?.collectedAt ?? '',
    ])
  );
  downloadCSV('benchmarking_apps_pesquisa.csv', [header, ...rows]);
}

export function exportFunnelCSV(funnel: Funnel, searches: SearchLog[], meta: SearchMeta | null) {
  const stages: [string, number][] = [
    ['Resultados brutos (soma das buscas)', funnel.rawHits],
    ['Duplicatas unificadas', funnel.duplicatesMerged],
    ['Apps únicos', funnel.uniqueApps],
    ['Sem nota', funnel.noScore],
    [`Nota abaixo de ${meta?.minScore ?? 4}`, funnel.belowMinScore],
    ['Aprovados no filtro de nota', funnel.passedScoreFilter],
    ['Excluídos por não serem gratuitos', funnel.notFree],
    ['Aprovados sem detalhes (mantidos e sinalizados)', funnel.detailsFailed],
    ['Amostra final', funnel.finalSample],
  ];
  const lines = [
    line(['Etapa', 'Quantidade']),
    ...stages.map(s => line(s)),
    '',
    line(['Termo', 'País', 'Idioma', 'Solicitados', 'Retornados', 'Erro']),
    ...searches.map(s => line([s.term, s.country, s.lang, s.requested, s.returned, s.error ?? ''])),
  ];
  if (meta) {
    lines.push('', line(['Data da coleta', meta.collectedAt]), line(['Nota mínima', meta.minScore]),
      line(['Somente gratuitos', meta.onlyFree ? 'Sim' : 'Não']), line(['Termos', meta.terms.join(', ')]));
  }
  downloadCSV('funil_coleta.csv', lines);
}