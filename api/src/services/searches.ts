import type { IAppItem } from 'google-play-scraper';
import { LIST_MAX_PASSES, LIST_MIN_PASSES, STORE_RESULTS_LIMIT } from '../config.js';
import { UserFacingError } from '../lib/errors.js';
import type { AppDetails, JobProgress, Locale, SearchResponse } from '../types.js';
import { runPipeline } from './pipeline.js';
import type { StoreList } from './pipeline.js';
import { isSimilarSectionMissing, searchApps, similarApps } from './playStore.js';

type Report = (progress: JobProgress) => void;

/**
 * A loja pode variar a lista entre consultas idênticas. Consulta no mínimo LIST_MIN_PASSES vezes
 * e continua até uma consulta não trazer nenhum app novo (máx. LIST_MAX_PASSES). Usa a união,
 * com a melhor posição observada de cada app.
 */
async function collectStableList(
    query: string,
    fetchOnce: () => Promise<IAppItem[]>,
    onPass: (pass: number) => void,
    storeLimit?: number
): Promise<StoreList> {
    const seen = new Map<string, { item: IAppItem; position: number; passesSeen: number }>();
    let passes = 0;
    let largest = 0;

    while (passes < LIST_MAX_PASSES) {
        onPass(passes + 1);
        const items = await fetchOnce();
        passes++;
        largest = Math.max(largest, items.length);

        let added = 0;
        const inThisPass = new Set<string>();
        items.forEach((item, index) => {
            if (inThisPass.has(item.appId)) return; // repetido dentro da mesma consulta
            inThisPass.add(item.appId);
            const entry = seen.get(item.appId);
            if (entry) {
                entry.passesSeen++;
                entry.position = Math.min(entry.position, index + 1);
            } else {
                seen.set(item.appId, { item, position: index + 1, passesSeen: 1 });
                added++;
            }
        });
        if (passes >= LIST_MIN_PASSES && added === 0) break;
    }

    const all = [...seen.values()];
    return {
        query,
        entries: all.sort((a, b) => a.position - b.position).map(({ item, position }) => ({ item, position })),
        passes,
        intermittent: all.filter((e) => e.passesSeen < passes).length,
        reachedLimit: storeLimit !== undefined && largest >= storeLimit,
    };
}

/** Modo 1: lista completa da loja para cada termo. */
export async function runKeywordSearch(terms: string[], locale: Locale, report: Report): Promise<SearchResponse> {
    const lists: StoreList[] = [];
    // Termos em sequência (não em paralelo) para não disparar rajadas contra o Google.
    for (const [i, term] of terms.entries()) {
        try {
            const list = await collectStableList(
                term,
                () => searchApps(term, locale),
                (pass) =>
                    report({
                        phase: 'search',
                        done: i,
                        total: terms.length,
                        message: `Buscando "${term}" na Play Store${pass > 1 ? ` (consulta ${pass})` : ''}`,
                    }),
                STORE_RESULTS_LIMIT
            );
            lists.push(list);
        } catch (err) {
            console.error(`Falha na busca do termo "${term}":`, err);
            // Sem a lista completa de um termo a amostra ficaria incompleta: falha explícita, sem resultado parcial.
            throw new UserFacingError(`Não foi possível buscar "${term}" na Play Store. Nenhum resultado parcial foi gerado; tente novamente.`);
        }
    }
    report({ phase: 'search', done: terms.length, total: terms.length, message: 'Busca na loja concluída' });

    return runPipeline({ mode: 'keyword', lists, locale, terms, report });
}

/** Modo 2: seção "Apps semelhantes" que a própria loja exibe na página do app informado. */
export async function runSimilarSearch(seed: AppDetails, locale: Locale, report: Report): Promise<SearchResponse> {
    let list: StoreList;
    try {
        list = await collectStableList(
            seed.title,
            // O próprio app não é concorrente dele mesmo.
            async () => (await similarApps(seed.appId, locale)).filter((item) => item.appId !== seed.appId),
            (pass) =>
                report({
                    phase: 'search',
                    done: 0,
                    total: 1,
                    message: `Lendo "Apps semelhantes" de ${seed.title}${pass > 1 ? ` (consulta ${pass})` : ''}`,
                })
        );
    } catch (err) {
        if (isSimilarSectionMissing(err)) {
            throw new UserFacingError('Não foi encontrada a seção "Apps semelhantes" na página deste app na Play Store.');
        }
        console.error(`Falha ao ler semelhantes de ${seed.appId}:`, err);
        throw new UserFacingError('Não foi possível ler os apps semelhantes na Play Store. Tente novamente em instantes.');
    }

    const notices: string[] = [];
    if (list.entries.length === 0) notices.push('A página deste app na Play Store não exibe a seção "Apps semelhantes".');

    return runPipeline({
        mode: 'similar',
        lists: [list],
        locale,
        terms: [],
        seed: {
            appId: seed.appId,
            title: seed.title,
            developer: seed.developer,
            icon: seed.icon,
            genre: seed.genre,
            genreId: seed.genreId,
            url: seed.url,
        },
        notices,
        report,
    });
}
