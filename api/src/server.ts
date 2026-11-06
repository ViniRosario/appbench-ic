import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { jobsRouter } from './routes/jobs.js';
import { searchRouter } from './routes/search.js';
import { similarRouter } from './routes/similar.js';
import { verifySimilarPatch } from './services/playStore.js';

if (!(await verifySimilarPatch())) {
    console.error(
        '❌ A correção do google-play-scraper (api/patches) não está aplicada: o modo concorrente ficará desativado. ' +
            'Rode `npm install` na pasta api.'
    );
}

const app = express();

app.use(cors());
app.use(express.json());

app.use(searchRouter);
app.use(similarRouter);
app.use(jobsRouter);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
