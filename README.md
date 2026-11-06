# AppBench

Ferramenta de extração e benchmarking de aplicativos da Google Play Store. Nasceu para apoiar uma pesquisa de Iniciação Científica (mapeamento de apps de saúde) e funciona para qualquer nicho: gera amostras de apps com **contagens conferidas e trilha de auditoria**, prontas para análise no Excel.

**Produção:** [appbench-ic.vercel.app](https://appbench-ic.vercel.app/)

---

## Metodologia de coleta

### Modo palavra-chave
1. **Lista completa da loja.** Cada termo é pesquisado na Play Store e a lista é paginada até o fim. A loja exibe **no máximo ~250 apps por busca**; quando um termo atinge esse limite, o resultado avisa (termos mais específicos ampliam a cobertura).
2. **Consultas repetidas até estabilizar.** Para alguns termos a loja devolve conjuntos ligeiramente diferentes em consultas idênticas feitas com segundos de intervalo (medido: "terapia" retornou 248, 248, 250 e 250 apps, com 6 aparecendo só em parte das consultas). Por isso cada lista é consultada no mínimo 2 vezes, até uma consulta não trazer app novo (máx. 5), e a amostra usa a **união**. O resultado informa quantas consultas foram feitas e quantos apps foram intermitentes.
3. **Duplicatas entre termos** são contadas uma vez; cada app guarda em quais termos apareceu e a melhor posição observada (`gravidez #12`).

### Modo concorrente
Usa a seção **"Apps semelhantes"** que a própria Play Store exibe na página do app informado (lista completa, com as mesmas consultas repetidas). Restringir categorias é opcional (filtro **Categorias**, com atalho para a categoria do app informado): apps de saúde se dividem entre *Medicina*, *Saúde e fitness* e *Criação de filhos*, e restringir por padrão descartaria concorrentes legítimos (ex.: "V-Baby: Gravidez e Maternidade", em *Medicina*, é semelhante a um app de gravidez de *Criação de filhos*).

### Leitura de cada app
A lista da loja traz poucos dados, então **a página de cada app é lida individualmente**: nota, nº de avaliações, downloads, categoria, preço, anúncios, compras no app, classificação indicativa, datas de lançamento e de atualização, e textos. Leituras que falham são repetidas (backoff exponencial e uma rodada final mais espaçada). Um app que ainda assim não puder ser lido **não some**: entra como excluído por "falha de leitura" e gera um aviso.

### Coleta × filtros
A coleta (termos ou app, mais o **país da loja**) é feita uma vez no servidor e traz todos os apps com todos os dados. Os **filtros são aplicados na hora, no navegador**: mudar um filtro recalcula a amostra, o funil e as exportações sem buscar de novo na loja. **Todos os filtros começam desligados** — a amostra inicial é a coleta inteira.

País da loja: Brasil, Portugal, Estados Unidos, Reino Unido, Canadá, Austrália, Índia, Espanha, México, Argentina, Colômbia e Chile. O idioma da loja define a língua dos textos dos apps (e, portanto, em que língua pesquisar os termos).

### Filtros
| Grupo | Filtro | Opções | Observação |
|---|---|---|---|
| Qualidade | Nota mínima | Qualquer, 3,0+, 3,5+, 4,0+, 4,5+ | Comparada com a nota **como a loja exibe** (1 casa: 4,05 aparece como "4,1"). |
| Qualidade | Mínimo de avaliações | Qualquer, 10+, 100+, 1 mil+, 10 mil+, 100 mil+ | Mede a confiabilidade da nota. |
| Alcance e maturidade | Mínimo de downloads | Qualquer, 1 mil+ … 100 mi+ | Faixa exibida pela loja. |
| Alcance e maturidade | Última atualização | Qualquer, 6 meses, 1 ano, 2 anos, 3 anos | Apps abandonados × mantidos. |
| Alcance e maturidade | Tempo de mercado | Lançados no último ano / 2 anos; no mercado há mais de 2 / 5 anos | Novos entrantes × apps consolidados. |
| Modelo de negócio | Preço | Todos, Gratuitos, Pagos | |
| Modelo de negócio | Anúncios | Indiferente, Sem, Com | "Contém anúncios" na loja. |
| Modelo de negócio | Compras no app | Indiferente, Sem, Com | Com a faixa de preço das compras. |
| Escopo | Categorias | Seleção múltipla, com contagem | Categorias presentes na coleta. |
| Escopo | Excluir jogos | liga/desliga | Categorias `GAME*`. |
| Escopo | Somente apps que citam o termo | liga/desliga | Modo palavra-chave. Ver "Evidência de citação". |

Apps sem avaliações são contados à parte ("sem avaliações") quando há filtro de nota ou de nº de avaliações; apps sem data informada pela loja são excluídos com esse motivo explícito quando há filtro de data. Cada app excluído é contado **apenas no primeiro critério** que o exclui, nesta ordem: falha de leitura → categorias → jogos → preço → anúncios → compras no app → não cita o termo → sem avaliações → nota → avaliações → downloads → atualização → tempo de mercado.

### Evidência de citação
Para cada app, o AppBench mostra em que campo (título, resumo ou descrição) cada termo pesquisado aparece — como palavra inteira, ignorando acentos, maiúsculas, plural simples e separadores (`pré-natal` = `pre natal` = `prenatal`). É uma evidência objetiva e conferível, **não** um julgamento de relevância: sinônimos e textos em outro idioma não contam (ex.: "Medidor de pressão" fala em "pressão arterial" e não cita "hipertensão"). Por isso o filtro vem desligado: a triagem final de relevância cabe ao pesquisador.

### Conferência e auditoria
- O funil sempre fecha: **únicos = incluídos + excluídos** (a API confere `únicos = lidos + falhas`, e o cliente confere a aplicação dos filtros).
- **Exportar amostra:** apps incluídos com os filtros da tela, em tabela pura para análise.
- **Exportar auditoria:** todos os apps identificados (incluídos e excluídos, com motivo e detalhe, ex.: "Nota 3,2 abaixo do mínimo 4,0"), precedidos da loja, data/hora da coleta e da exportação, filtros aplicados, contagem por lista e avisos.
- Datas: listas da loja são lidas na hora (sem cache); detalhes de cada app têm cache de até 1 h e cada app informa quando foi lido.

### Validação
A coleta foi conferida contra a loja por um validador independente (paginação e leitura das páginas públicas implementadas à parte, sem o código da API nem a biblioteca): mesma quantidade e mesmo conjunto de apps por termo; nota, avaliações, categoria, downloads, preço, anúncios, compras no app e datas idênticos à página; e a decisão de incluir/excluir refeita com os dados da página, em amostras de apps incluídos e excluídos.

### Limites que nenhuma ferramenta contorna
- A loja exibe no máximo ~250 apps por busca e **varia a lista e a ordem ao longo do tempo** — registre a data da coleta (a auditoria já traz).
- Posições valem para o momento da coleta.
- Relevância temática exige triagem humana; a ferramenta entrega a lista completa e as evidências.

---

## Arquitetura

```
appbench-ic/
├── api/                  Backend: Node.js + Express + google-play-scraper (Render)
│   ├── patches/          Correção versionada da google-play-scraper (aplicada no npm install)
│   └── src/
│       ├── server.ts         monta o Express, registra as rotas e confere o patch
│       ├── config.ts         limites da loja, consultas, concorrência, cache
│       ├── validation.ts     leitura e validação do corpo das requisições (termos, app, loja)
│       ├── routes/           /api/search, /api/similar (criam a busca) e /api/jobs (andamento)
│       ├── services/
│       │   ├── searches.ts   coleta das listas da loja até estabilizar (os dois modos)
│       │   ├── pipeline.ts   leitura de cada app (com releitura das falhas) → funil conferido
│       │   ├── relevance.ts  evidência de citação dos termos
│       │   ├── playStore.ts  acesso à loja (limite global de concorrência, retry, cache)
│       │   └── jobs.ts       buscas em segundo plano
│       └── lib/              cache, concorrência, retry, erros, datas da loja
├── app/                  Frontend: React + TypeScript + Vite + Tailwind (Vercel)
│   └── src/
│       ├── hooks/            useAppSearch (coleta + filtros aplicados na hora)
│       ├── components/       SearchForm, FiltersPanel, SearchProgress, FunnelPanel, ResultsTable...
│       └── lib/              criteria.ts (filtros, motivos, funil), markets.ts (países), cliente HTTP, CSV
└── shared/
    └── contract.ts       tipos de requisição/resposta usados pela API e pelo app
```

### Correção na google-play-scraper
A função `similar` da biblioteca (até a 10.1.4) usava a **primeira seção** da página do app como "apps semelhantes" — que pode ser "Mais de &lt;desenvolvedor&gt;". Para o Google Maps, por exemplo, devolvia Gemini, YouTube Kids e Google Docs como concorrentes. A correção fica em [`api/patches/`](api/patches) e é aplicada automaticamente pelo `postinstall` (patch-package). Se ela não estiver aplicada, a API **desativa o modo concorrente** em vez de devolver dados errados. A versão da biblioteca é fixa (`10.1.4`): ao atualizar, refaça e revalide o patch.

**Proteções contra bloqueio do Google:** no máximo 4 requisições simultâneas somando todas as buscas, termos pesquisados em sequência e novas tentativas com backoff exponencial.

---

## API

Base: `https://api-appbench.onrender.com`. Uma coleta completa pode levar minutos, então ela roda **em segundo plano**:

| Método | Rota | Corpo / resposta |
|---|---|---|
| `POST` | `/api/search` | `{ "terms": ["gravidez", "gestante"], "country": "br", "lang": "pt" }` → `202 { "jobId" }` |
| `POST` | `/api/similar` | `{ "app": "com.nu.production", "country": "br", "lang": "pt" }` → `202 { "jobId" }` |
| `GET` | `/api/jobs/:jobId` | `{ status, progress, result?, error? }` — consulte até `status` ser `done` ou `error` |
| `GET` | `/api/health` | — |

`country` (2 letras) e `lang` (`pt`, `en` ou `es`) são opcionais (padrão `br` / `pt`). Máximo de 10 termos por busca. A API não filtra: devolve a coleta completa e os filtros ficam com o cliente.

O resultado segue o tipo `SearchResponse` de [`shared/contract.ts`](shared/contract.ts): loja e termos, contagem por lista, funil da coleta, avisos, todos os apps lidos e os que não puderam ser lidos. Erros retornam `{ "error": "mensagem" }` com status 400 (entrada inválida), 404 (app ou busca não encontrados), 429 (servidor no limite de buscas simultâneas), 502 (falha na loja) ou 503 (modo concorrente desativado).

> No plano gratuito do Render, o servidor "dorme" sem uso; a primeira busca pode levar até 1 minuto para começar. Resultados ficam disponíveis por 30 minutos e se perdem se o servidor reiniciar.

---

## Rodando localmente

Requisito: Node.js 22+.

**1. API**
```bash
cd api
npm install        # também aplica o patch da google-play-scraper
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
Os tipos de requisição e resposta ficam em `shared/contract.ts`. Ao mudá-los, rode `npm run typecheck` na `api` e `npm run build` no `app`: os dois lados acusam o que precisa ser ajustado. Para adicionar um filtro: inclua o campo em `Criteria` e em `DEFAULT_CRITERIA` (desligado), a regra em `exclusionFor`, o motivo em `EXCLUSION_ORDER`/`REASON_LABELS` e a descrição em `describeCriteria` (`app/src/lib/criteria.ts`); depois o controle em `FiltersPanel`. Se o filtro precisar de um dado novo do app, acrescente-o em `AppResult` (`shared/contract.ts`) e em `fetchDetails` (`api/src/services/playStore.ts`).

---

## Deploy
- **Frontend (Vercel):** Root Directory `app`. A opção *Include files outside the root directory* deve ficar ativa (é o padrão), pois o build lê `shared/`.
- **Backend (Render):** Root Directory `api`, start command `npm start`. O `npm install` do build aplica o patch; confira no log a linha `Applying patches... google-play-scraper@10.1.4 ✔`.
