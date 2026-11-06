import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { searchRouter } from './routes/search.js';
import { similarRouter } from './routes/similar.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(searchRouter);
app.use(similarRouter);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
