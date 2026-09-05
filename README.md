# 🔍 AppBench: Extrator e Analisador de Aplicativos

Um painel de inteligência de mercado (*Market Intelligence Dashboard*) desenvolvido para automatizar a extração, contagem e análise estrutural de aplicativos na Google Play Store, ignorando anúncios e limitações de paginação.

**Estudo de Caso Base:** Este projeto nasceu como ferramenta metodológica para uma Iniciação Científica focada no benchmarking de aplicativos móveis para o cuidado pré-natal na Atenção Primária à Saúde.

## 🚀 O Problema que Resolve
Pesquisadores e analistas de mercado enfrentam três grandes barreiras ao mapear aplicativos nas lojas oficiais:
1. **Poluição de Dados:** Resultados orgânicos misturados com apps patrocinados.
2. **Caixa Preta de Quantidade:** Omissão do número total real de aplicativos para uma palavra-chave.
3. **Bloqueio de Paginação:** Limite técnico imposto pela loja (geralmente 50 apps por requisição) para evitar raspagem de dados.

O **AppBench** resolve isso cruzando múltiplos termos de busca, removendo duplicatas via IDs únicos e devolvendo um conjunto de dados limpo (JSON/CSV) pronto para análise científica ou mercadológica.

## 🛠️ Tecnologias Utilizadas (Stack)
A arquitetura do projeto separa o motor de raspagem de dados da interface do usuário, facilitando a escalabilidade.

* **Backend (API):** Node.js com TypeScript
* **Core de Extração:** `google-play-scraper`
* **Frontend (Interface):** React (com integração futura para React Native)
* **Gerenciamento de Pacotes:** NPM / Yarn

## ⚙️ Arquitetura do Sistema
* `/api`: Microserviço responsável por receber as palavras-chave, gerenciar as requisições assíncronas para a loja e sanitizar os dados (removendo aspas, formatando links).
* `/app`: Interface visual de consumo da API, exibindo a tabela interativa e opções de exportação de dados.