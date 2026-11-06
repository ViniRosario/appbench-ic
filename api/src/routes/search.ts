import { Router } from 'express';
import type { Request, Response } from 'express';
import { startJob } from '../services/jobs.js';
import { runKeywordSearch } from '../services/searches.js';
import { asRecord, parseLocale, parseTerms } from '../validation.js';
import { BUSY_MESSAGE } from './messages.js';

/** Modo 1: busca por palavra-chave. Responde 202 com o jobId; o resultado sai em GET /api/jobs/:jobId. */
export const searchRouter = Router();

searchRouter.post('/api/search', (req: Request, res: Response): void => {
    const body = asRecord(req.body);
    const locale = parseLocale(body);
    const terms = parseTerms(body.terms);

    if (terms.length === 0) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms' com ao menos um termo." });
        return;
    }

    const job = startJob((report) => runKeywordSearch(terms, locale, report));
    if (!job) {
        res.status(429).json({ error: BUSY_MESSAGE });
        return;
    }

    console.log(`\n🔎 [keyword ${job.jobId}] ${terms.join(', ')} | loja: ${locale.country}-${locale.lang}`);
    res.status(202).json({ jobId: job.jobId });
});
