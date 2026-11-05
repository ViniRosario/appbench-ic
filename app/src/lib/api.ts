import axios from 'axios';
import type { Filters, SearchResponse } from '../types';

// Em desenvolvimento, defina VITE_API_URL=http://localhost:3333 em app/.env.local
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api-appbench.onrender.com';

// Deep fetch pode demorar, principalmente com o servidor do Render "acordando".
const client = axios.create({ baseURL: BASE_URL, timeout: 180_000 });

export async function searchByKeywords(terms: string[], filters: Filters): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>('/api/search', { terms, ...filters });
  return data;
}

export async function searchSimilar(app: string, filters: Filters): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>('/api/similar', { app, ...filters });
  return data;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    if (err.code === 'ECONNABORTED') return 'A busca demorou demais. Tente menos termos ou filtros mais restritivos.';
  }
  return 'Erro ao buscar dados. O servidor pode estar iniciando (até 1 min no primeiro acesso) ou indisponível.';
}
