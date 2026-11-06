import { Router } from 'express';
import type { Request, Response } from 'express';
import { isNotFound } from '../lib/errors.js';
import { startJob } from '../services/jobs.js';
import { fetchDetails, isSimilarAvailable } from '../services/playStore.js';
import { runSimilarSearch } from '../services/searches.js';
import type { AppDetails } from '../types.js';
import { asRecord, extractAppId, parseLocale } from '../validation.js';
import { BUSY_MESSAGE } from './messages.js';

/** Modo 2: concorrentes. Valida o app na hora (404 rápido) e roda a coleta em segundo plano. */
export const similarRouter = Router();

similarRouter.post('/api/similar', async (req: Request, res: Response): Promise<void> => {
    if (!isSimilarAvailable()) {
        res.status(503).json({
            error: 'Modo concorrente indisponível: a correção da biblioteca google-play-scraper não está aplicada no servidor.',
        });
        return;
    }

    const body = asRecord(req.body);
    const locale = parseLocale(body);
    const appId = extractAppId(body.app);

    if (!appId) {
        res.status(400).json({ error: "Envie em 'app' a URL da Play Store ou o ID do aplicativo (ex: com.nubank.app)." });
        return;
    }

    let seed: AppDetails;
    try {
        seed = await fetchDetails(appId, locale);
    } catch (err) {
        if (isNotFound(err)) {
            res.status(404).json({ error: `Aplicativo '${appId}' não encontrado na Play Store (${locale.country.toUpperCase()}).` });
        } else {
            console.error(`Falha ao ler o app ${appId}:`, err);
            res.status(502).json({ error: 'Não foi possível ler o app informado na Play Store. Tente novamente em instantes.' });
        }
        return;
    }

    const job = startJob((report) => runSimilarSearch(seed, locale, report));
    if (!job) {
        res.status(429).json({ error: BUSY_MESSAGE });
        return;
    }

    console.log(`\n🔎 [similar ${job.jobId}] ${appId} | loja: ${locale.country}-${locale.lang}`);
    res.status(202).json({ jobId: job.jobId });
});
