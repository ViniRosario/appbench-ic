import express, { Request, Response } from 'express';
import cors from 'cors';
import gplay from 'google-play-scraper';

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const { terms, limit = 100 } = req.body;

    if (!terms || !Array.isArray(terms)) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms'." });
        return;
    }

    const appMap = new Map<string, any>();
    console.log(`\n⏳ FASE 1: Iniciando varredura rápida para: ${terms.join(', ')}`);

    try {
        for (const term of terms) {
            const results = await gplay.search({
                term: term,
                num: limit,
                lang: 'pt',
                country: 'br'
            });

            for (const app of results) {
                if (appMap.has(app.appId)) {
                    const existing = appMap.get(app.appId);
                    existing.isDuplicate = true;
                    
                    if (!existing.keywordOrigin.includes(term)) {
                        existing.keywordOrigin += `, ${term}`; 
                    }
                } else {
                    appMap.set(app.appId, {
                        appId: app.appId,
                        title: app.title,
                        developer: app.developer,
                        score: app.score,
                        free: app.free,
                        summary: app.summary,
                        keywordOrigin: term,
                        url: app.url,
                        isDuplicate: false
                    });
                }
            }
        }

        console.log(`🔍 FASE 1 Concluída. ${appMap.size} apps únicos encontrados.`);
        console.log(`⏳ FASE 2: Filtrando notas altas e buscando Downloads...`);

        const finalApps: any[] = [];
        let duplicatedCount = 0;

        // FASE 2: O Novo Filtro (>= 4 estrelas)
        for (const [appId, basicData] of appMap.entries()) {
            // Converte a nota para número. Se o app não tiver nota, vira 0.
            const score = Number(basicData.score) || 0;

            // NOVA REGRA: Só faz a busca profunda e entra na tabela se a nota for 4 ou mais
            if (score >= 4) {
                try {
                    // Ainda precisamos entrar na página para pegar os Downloads e o Ano (para não quebrar as colunas que você já tem na tela)
                    const fullApp = await gplay.app({ appId: appId, lang: 'pt', country: 'br' });
                    
                    const updatedDate = new Date(fullApp.updated);
                    basicData.updatedYear = updatedDate.getFullYear();
                    basicData.installs = fullApp.installs; 
                    
                    if (basicData.isDuplicate) {
                        duplicatedCount++; 
                    }
                    
                    finalApps.push(basicData);
                } catch (error) {
                    console.log(`⚠️ Erro ao acessar detalhes do app ${appId}, pulando...`);
                }
            }
        }

        console.log(`✅ Tudo pronto! ${finalApps.length} aplicativos possuem nota 4 ou superior.`);
        
        res.status(200).json({
            total: finalApps.length,
            duplicatedCount: duplicatedCount,
            data: finalApps
        });

    } catch (error) {
        console.error("Erro durante a extração:", error);
        res.status(500).json({ error: "Falha ao extrair dados da loja." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});