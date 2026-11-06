import { randomUUID } from 'node:crypto';
import { JOB_TTL_MS, MAX_RUNNING_JOBS } from '../config.js';
import { UserFacingError } from '../lib/errors.js';
import type { JobProgress, JobState, SearchResponse } from '../types.js';

/**
 * Buscas rodam em segundo plano: uma coleta completa pode levar minutos, mais do que
 * uma requisição HTTP aguenta com segurança. O cliente consulta o andamento pelo jobId.
 * Armazenamento em memória: suficiente para uma instância; reiniciar o servidor descarta as buscas.
 */

interface Job extends JobState {
    finishedAt?: number;
}

const jobs = new Map<string, Job>();

const GENERIC_ERROR = 'Falha ao extrair dados da loja. Tente novamente em instantes.';

function cleanup(): void {
    const now = Date.now();
    for (const [id, job] of jobs) {
        if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS) jobs.delete(id);
    }
}

const runningCount = (): number => [...jobs.values()].filter((j) => j.status === 'running').length;

export type JobTask = (report: (progress: JobProgress) => void) => Promise<SearchResponse>;

/** Inicia a tarefa em segundo plano. Retorna null se o servidor já estiver no limite de buscas simultâneas. */
export function startJob(task: JobTask): Job | null {
    cleanup();
    if (runningCount() >= MAX_RUNNING_JOBS) return null;

    const job: Job = {
        jobId: randomUUID(),
        status: 'running',
        progress: { phase: 'queued', done: 0, total: 0, message: 'Preparando a busca' },
    };
    jobs.set(job.jobId, job);

    task((progress) => {
        job.progress = progress;
    })
        .then((result) => {
            job.result = result;
            job.status = 'done';
            job.progress = { phase: 'done', done: result.funnel.unique, total: result.funnel.unique, message: 'Concluído' };
        })
        .catch((err: unknown) => {
            if (!(err instanceof UserFacingError)) console.error(`Busca ${job.jobId} falhou:`, err);
            job.error = err instanceof UserFacingError ? err.message : GENERIC_ERROR;
            job.status = 'error';
        })
        .finally(() => {
            job.finishedAt = Date.now();
        });

    return job;
}

export function getJob(jobId: string): JobState | undefined {
    const job = jobs.get(jobId);
    if (!job) return undefined;
    const { finishedAt: _finishedAt, ...state } = job;
    return state;
}
