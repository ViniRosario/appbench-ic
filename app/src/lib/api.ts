import axios from 'axios';
import type {
  ErrorResponse,
  JobAccepted,
  JobProgress,
  JobState,
  KeywordSearchRequest,
  SearchResponse,
  SimilarSearchRequest,
  StoreLocale,
} from '../types';

// Em desenvolvimento, defina VITE_API_URL=http://localhost:3333 em app/.env.local
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api-appbench.onrender.com';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_NETWORK_FAILURES = 5;

// O POST pode esperar o servidor do Render "acordar" (até ~1 min no primeiro acesso).
const client = axios.create({ baseURL: BASE_URL, timeout: 90_000 });

/** Erro com mensagem pronta para mostrar ao usuário. */
export class SearchError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startKeywordSearch(terms: string[], locale: StoreLocale): Promise<string> {
  const body: KeywordSearchRequest = { terms, ...locale };
  const { data } = await client.post<JobAccepted>('/api/search', body);
  return data.jobId;
}

export async function startSimilarSearch(app: string, locale: StoreLocale): Promise<string> {
  const body: SimilarSearchRequest = { app, ...locale };
  const { data } = await client.post<JobAccepted>('/api/similar', body);
  return data.jobId;
}

/**
 * Consulta o andamento da busca até ela terminar.
 * Devolve null se `isCancelled` indicar que o resultado não interessa mais (nova busca ou tela fechada).
 */
export async function waitForJob(
  jobId: string,
  onProgress: (progress: JobProgress) => void,
  isCancelled: () => boolean
): Promise<SearchResponse | null> {
  let networkFailures = 0;

  while (!isCancelled()) {
    await sleep(POLL_INTERVAL_MS);
    if (isCancelled()) break;

    let state: JobState;
    try {
      ({ data: state } = await client.get<JobState>(`/api/jobs/${jobId}`, { timeout: 30_000 }));
      networkFailures = 0;
    } catch (err) {
      // Resposta do servidor (ex.: 404 = busca expirou/servidor reiniciou) é definitiva; falha de rede tenta de novo.
      if (axios.isAxiosError(err) && err.response) throw err;
      if (++networkFailures >= MAX_POLL_NETWORK_FAILURES) throw err;
      continue;
    }

    onProgress(state.progress);
    if (state.status === 'done' && state.result) return state.result;
    if (state.status === 'error') throw new SearchError(state.error ?? 'A busca falhou.');
  }
  return null;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof SearchError) return err.message;
  if (axios.isAxiosError<Partial<ErrorResponse>>(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    if (err.code === 'ECONNABORTED') return 'O servidor demorou demais para responder. Tente novamente.';
  }
  return 'Erro ao buscar dados. O servidor pode estar iniciando (até 1 min no primeiro acesso) ou indisponível.';
}
