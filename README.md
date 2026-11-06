# AppBench

Ferramenta de extração e benchmarking de aplicativos da Google Play Store. Nasceu para apoiar uma pesquisa de Iniciação Científica (mapeamento de apps de saúde) e hoje funciona para qualquer nicho: gera amostras limpas e filtradas de apps e exporta para análise no Excel.

**Produção:** [appbench-ic.vercel.app](https://appbench-ic.vercel.app/)

---

## Funcionalidades

### Dois modos de busca
- **Por palavra-chave:** um ou vários termos separados por vírgula (ex: `gravidez, gestante, pré-natal`). Cada termo é pesquisado na Play Store e os resultados são unificados.
- **Por concorrente:** cole a URL da Play Store (ou o ID, ex: `com.nu.production`) de um app e o AppBench monta a lista de concorrentes a partir dos "apps semelhantes" da própria loja, em dois níveis:
  1. concorrentes diretos do app informado;
  2. concorrentes dos 3 principais concorrentes diretos, mantendo só os da **mesma categoria** do app original (evita ruído, como redes sociais numa busca por bancos).

### Busca profunda (deep fetch)
A listagem da Play Store traz poucos dados. Por isso, cada app encontrado tem sua página consultada individualmente para obter os metadados reais: nota, nº de avaliações, downloads, categoria, preço e data da última atualização.

### Filtros configuráveis
| Filtro | Opções |
|---|---|
| Nota mínima | Todas, 3.0+, 4.0+ (padrão), 4.5+ |
| Mínimo de downloads | Qualquer, 10 mil+, 100 mil+, 1 mi+, 10 mi+ |
| Preço | Todos, Gratuitos, Pagos |
| Atualizados nos últimos 2 anos | liga/desliga |
| Excluir jogos | liga/desliga (padrão: ligado) |

O painel de resultados mostra quantos apps foram analisados, quantos ficaram na amostra e **quantos cada filtro removeu**, o que é útil para documentar a metodologia da pesquisa.

### Duplicatas e relevância
No modo palavra-chave, apps que aparecem em mais de um termo são marcados e sobem na ordenação. No modo concorrente, apps citados por mais listas sobem; depois, os maiores em downloads.

### Exportação CSV
Arquivo UTF-8 com BOM e separador `;`, abre direto no Excel em português, com acentuação correta.

---

## Arquitetura

Frontend e backend desacoplados, com o contrato da API compartilhado entre os dois:

```
appbench-ic/
├── api/                  Backend: Node.js + Express + google-play-scraper (Render)
│   └── src/
│       ├── server.ts         monta o Express e registra as rotas
│       ├── config.ts         limites, TTLs de cache, concorrência
│       ├── types.ts          tipos internos da API
│       ├── validation.ts     leitura e validação do corpo das requisições
│       ├── routes/           /api/search e /api/similar
│       ├── services/
│       │   ├── playStore.ts  acesso à Play Store (com cache e retry)
│       │   └── pipeline.ts   deep fetch → filtros → ordenação → resposta
│       └── lib/              cache em memória, concorrência limitada, retry
├── app/                  Frontend: React + TypeScript + Vite + Tailwind (Vercel)
│   └── src/
│       ├── App.tsx           composição da página
│       ├── hooks/            useAppSearch (estado e ciclo da busca)
│       ├── components/       Header, SearchForm, FiltersPanel, ResultsPanel, ResultsTable...
│       └── lib/              cliente HTTP e exportação CSV
└── shared/
    └── contract.ts       tipos de requisição/resposta usados pela API e pelo app
```

**Proteções contra bloqueio do Google:** cache em memória (detalhes por 6h, listas por 1h, até 5.000 entradas), no máximo 4 requisições simultâneas, termos pesquisados em sequência e 1 nova tentativa em caso de falha.

---

## API

Base: `https://api-appbench.onrender.com`

| Método | Rota | Corpo |
|---|---|---|
| `POST` | `/api/search` | `{ "terms": ["gravidez", "gestante"], ...filtros }` |
| `POST` | `/api/similar` | `{ "app": "com.nu.production", ...filtros }` |
| `GET` | `/api/health` | — |

Filtros (todos opcionais): `minScore`, `minInstalls`, `recentOnly`, `excludeGames`, `price` (`all` \| `free` \| `paid`), `lang` e `country` (padrão `pt` / `br`). Em `/api/search` também é aceito `limit` (resultados por termo, 1–100, padrão 50); o máximo é 10 termos por busca.

A resposta segue o tipo `SearchResponse` de [`shared/contract.ts`](shared/contract.ts). Erros retornam `{ "error": "mensagem" }` com status 400 (entrada inválida), 404 (app não encontrado) ou 502 (falha na Play Store).

> No plano gratuito do Render, o servidor "dorme" sem uso; a primeira busca pode levar até 1 minuto.

---

## Rodando localmente

Requisito: Node.js 22+.

**1. API**
```bash
cd api
npm install
npm run dev        # http://localhost:3333
```

**2. Frontend** (em outro terminal)
```bash
cd app
npm install
echo "VITE_API_URL=http://localhost:3333" > .env.local   # sem isso, usa a API de produção
npm run dev        # http://localhost:5173
```

### Scripts úteis
| Pasta | Comando | O que faz |
|---|---|---|
| `api` | `npm run typecheck` | checagem de tipos |
| `app` | `npm run lint` | lint (oxlint) |
| `app` | `npm run build` | checagem de tipos + build de produção |

### Mudando o contrato
Os tipos de requisição e resposta ficam em `shared/contract.ts`. Ao mudá-los, rode `npm run typecheck` na `api` e `npm run build` no `app`: os dois lados acusam o que precisa ser ajustado. Algumas constantes ainda existem nos dois lados e precisam mudar juntas (há comentário em cada uma): opções de downloads (`ALLOWED_INSTALLS`) e o período de "atualizados recentemente" (`RECENT_YEARS`).

---

## Deploy
- **Frontend (Vercel):** Root Directory `app`. A opção *Include files outside the root directory* deve ficar ativa (é o padrão), pois o build lê `shared/`.
- **Backend (Render):** Root Directory `api`, start command `npm start`.
