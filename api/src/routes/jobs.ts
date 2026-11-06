import { Router } from 'express';
import type { Request, Response } from 'express';
import { getJob } from '../services/jobs.js';

/** Andamento e resultado de uma busca em segundo plano. */
export const jobsRouter = Router();

jobsRouter.get('/api/jobs/:jobId', (req: Request<{ jobId: string }>, res: Response): void => {
    const job = getJob(req.params.jobId);
    if (!job) {
        res.status(404).json({
            error: 'Busca não encontrada: ela expirou ou o servidor foi reiniciado. Faça a busca novamente.',
        });
        return;
    }
    res.json(job);
});
