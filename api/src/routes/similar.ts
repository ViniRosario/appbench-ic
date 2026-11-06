import { Router } from 'express';
import type { Request, Response } from 'express';
import { DETAIL_CONCURRENCY, SIMILAR_EXPANSION } from '../config.js';
import { mapLimit } from '../lib/async.js';
import { fetchDetails, similarApps } from '../services/playStore.js';
import { addCandidate, buildResponse, enrichAndFilter } from '../services/pipeline.js';
import type { CandidateMap } from '../services/pipeline.js';
import type { AppDetails, Candidate, SeedInfo } from '../types.js';
import { asRecord, extractAppId, parseFilters } from '../validation.js';

/** Modo 2: concorrentes / apps semelhantes a um app informado. */
export const similarRouter = Router();

similarRouter.post('/api/similar', async (req: Request, res: Response): Promise<void> => {
    const body = asRecord(req.body);
    const f = parseFilters(body);
    const appId = extractAppId(body.app);

    if (!appId) {
        res.status(400).json({ error: "Envie em 'app' a URL da Play Store ou o ID do aplicativo (ex: com.nubank.app)." });
        return;
    }

    console.log(`\n🔎 [similar] ${appId} | filtros: ${JSON.stringify(f)}`);

    let seedDetails: AppDetails;
    try {
        seedDetails = await fetchDetails(appId, f);
    } catch {
        res.status(404).json({ error: `Aplicativo '${appId}' não encontrado na Play Store (${f.country.toUpperCase()}).` });
        return;
    }

    const seed: SeedInfo = {
        appId: seedDetails.appId,
        title: seedDetails.title,
        developer: seedDetails.developer,
        icon: seedDetails.icon,
        genre: seedDetails.genre,
        url: seedDetails.url,
    };

    try {
        const candidates: CandidateMap = new Map();

        // Nível 1: concorrentes diretos do app informado.
        const direct = await similarApps(appId, f);
        direct.forEach((item, rank) => addCandidate(candidates, item, seed.title, rank));

        // Nível 2: expande pelos principais concorrentes diretos para ampliar a amostra.
        // Apps que aparecem em várias listas sobem no ranking (mais `sources`).
        const toExpand = direct.slice(0, SIMILAR_EXPANSION);
        const expanded = await mapLimit(toExpand, DETAIL_CONCURRENCY, (item) => similarApps(item.appId, f).catch(() => []));
        expanded.forEach((list, i) => {
            const origin = toExpand[i]?.title ?? '';
            list.forEach((item, rank) => addCandidate(candidates, item, origin, direct.length + rank));
        });

        candidates.delete(appId); // o próprio app não é concorrente dele mesmo

        // Concorrentes diretos sempre entram; os indiretos (nível 2) só se forem da mesma categoria
        // do app informado. Isso evita "ruído" (ex: redes sociais em uma busca por bancos).
        const directIds = new Set(direct.map((item) => item.appId));
        const isRelevant = (c: Candidate, d: AppDetails) =>
            directIds.has(c.appId) || !seedDetails.genreId || d.genreId === seedDetails.genreId;

        const { data, excluded } = await enrichAndFilter([...candidates.values()], f, 'similar', isRelevant);
        console.log(`✅ [similar] ${candidates.size} varridos → ${data.length} aprovados`, excluded);
        res.json(buildResponse('similar', candidates.size, data, excluded, seed));
    } catch (error) {
        console.error('Erro na busca por similares:', error);
        res.status(502).json({ error: 'Falha ao buscar concorrentes na loja. Tente novamente em instantes.' });
    }
});
