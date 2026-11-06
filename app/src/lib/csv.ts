import type { AppResult, SearchMode } from '../types';

const cell = (value: string | number): string =>
  `"${String(value).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`;

/** Gera e baixa um CSV (UTF-8 com BOM, separador ";") compatível com o Excel em pt-BR. */
export function exportToCSV(apps: AppResult[], mode: SearchMode): void {
  if (apps.length === 0) return;

  const originLabel = mode === 'similar' ? 'Origem (similar a)' : 'Palavras-Chave';
  const header = [
    'Título', 'Desenvolvedor', 'Categoria', 'Nota', 'Avaliações', 'Downloads', 'Downloads (mín.)',
    'Última Atualização', 'Preço', 'Duplicado', originLabel, 'Descrição', 'ID', 'Link',
  ].join(';');

  const rows = apps.map((a) =>
    [
      a.title,
      a.developer,
      a.genre,
      a.score ? a.score.toFixed(2).replace('.', ',') : '',
      a.ratings,
      a.installs,
      a.minInstalls,
      a.updatedAt ? a.updatedAt.slice(0, 10) : '',
      a.free ? 'Gratuito' : a.priceText,
      a.isDuplicate ? 'Sim' : 'Não',
      a.sources.join(', '),
      a.summary || 'Sem descrição',
      a.appId,
      a.url,
    ]
      .map(cell)
      .join(';')
  );

  const blob = new Blob(['﻿' +[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appbench_${mode}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
