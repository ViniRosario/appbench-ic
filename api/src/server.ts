import express, { Request, Response } from 'express';
import cors from 'cors';
import gplay from 'google-play-scraper';

const app = express();
const PORT = 3333;

// Middlewares básicos
app.use(cors()); // Permite que o frontend se conecte a esta API
app.use(express.json()); // Permite receber dados no formato JSON

// Rota principal de extração
app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const { terms, limit = 100 } = req.body;

    if (!terms || !Array.isArray(terms)) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms'." });
        return;
    }

    const uniqueApps: any[] = [];
    const foundIds = new Set<string>();

    console.log(`⏳ Iniciando varredura para os termos: ${terms.join(', ')}`);

    try {
        for (const term of terms) {
            // A biblioteca extrai os dados diretamente da Play Store
            const results = await gplay.search({
                term: term,
                num: limit,
                lang: 'pt',
                country: 'br'
            });

            for (const app of results) {
                if (!foundIds.has(app.appId)) {
                    foundIds.add(app.appId);
                    
                    uniqueApps.push({
                        title: app.title,
                        developer: app.developer,
                        score: app.score,
                        free: app.free,
                        keywordOrigin: term,
                        url: app.url
                    });
                }
            }
        }

        console.log(`✅ Extração concluída. ${uniqueApps.length} apps encontrados.`);
        
        // Devolve os dados limpos em formato JSON para o Frontend
        res.status(200).json({
            total: uniqueApps.length,
            data: uniqueApps
        });

    } catch (error) {
        console.error("Erro durante a extração:", error);
        res.status(500).json({ error: "Falha ao extrair dados da loja." });
    }
});

// Inicializa o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Endpoint disponível em: http://localhost:${PORT}/api/search`);
});