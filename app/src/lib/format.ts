import type { AppSource, TermMatch, TextField } from '../types';

export const FIELD_LABELS: Record<TextField, string> = {
  title: 'título',
  summary: 'resumo',
  description: 'descrição',
};

export const formatNumber = (n: number): string => n.toLocaleString('pt-BR');

export const formatDateTime = (iso: string): string =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export const formatDate = (iso: string): string => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/** Data de calendário sem hora (ex.: lançamento, guardado como meia-noite UTC): formata em UTC para não voltar um dia. */
export const formatCalendarDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';

export const formatMonthYear = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '-';

export const bestPosition = (sources: AppSource[]): number => Math.min(...sources.map((s) => s.position));

/** "gravidez (#12); gestante (#40)" */
export const formatSources = (sources: AppSource[]): string =>
  sources.map((s) => `${s.query} (#${s.position})`).join('; ');

/** "gravidez (título); gestante (descrição)" */
export const formatTermMatches = (matches: TermMatch[]): string =>
  matches.map((m) => `${m.term} (${FIELD_LABELS[m.field]})`).join('; ');
