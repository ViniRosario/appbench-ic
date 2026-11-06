import { Router } from 'express';
import type { Request, Response } from 'express';
import { searchApps } from '../services/playStore.js';
import { addCandidate, buildResponse, enrichAndFilter } from '../services/pipeline.js';
import type { CandidateMap } from '../services/pipeline.js';
import { asRecord, parseFilters, parseLimit, parseTerms } from '../validation.js';

/** Modo 1: busca por palavra-chave. */
export const searchRouter = Router();

searchRouter.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const body = asRecord(req.body);
    const f = parseFilters(body);
    const terms = parseTerms(body.terms);
    const limit = parseLimit(body.limit);

    if (terms.length === 0) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms' com ao menos um termo." });
        return;
    }

    console.log(`\n🔎 [keyword] ${terms.join(', ')} | filtros: ${JSON.stringify(f)}`);

    try {
        const candidates: CandidateMap = new Map();
        // Termos em sequência (não em paralelo) para não disparar rajadas contra o Google.
        for (const term of terms) {
            const results = await searchApps(term, limit, f);
            results.forEach((item, rank) => addCandidate(candidates, item, term, rank));
        }

        const { data, excluded } = await enrichAndFilter([...candidates.values()], f, 'keyword');
        console.log(`✅ [keyword] ${candidates.size} varridos → ${data.length} aprovados`, excluded);
        res.json(buildResponse('keyword', candidates.size, data, excluded));
    } catch (error) {
        console.error('Erro na busca por palavra-chave:', error);
        res.status(502).json({ error: 'Falha ao extrair dados da loja. Tente novamente em instantes.' });
    }
});
