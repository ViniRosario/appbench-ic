# AppBench | Intelligence

Uma ferramenta metodológica de extração e benchmarking de aplicativos da Google Play Store, desenvolvida para dar suporte a pesquisas acadêmicas (Iniciação Científica) na identificação e filtragem de soluções móveis voltadas à saúde.

**Acesso ao Sistema (Produção):** [https://appbench-ic.vercel.app/](https://appbench-ic.vercel.app/)

---

## Objetivo do Projeto
Automatizar e aplicar rigor científico na coleta de dados da Play Store, superando as limitações da busca convencional. O sistema realiza uma **Busca Profunda (Deep Fetch)**, varrendo aplicativos em múltiplos idiomas (ASO Multilíngue) e aplicando filtros metodológicos para compor a base de dados da pesquisa.

## Principais Funcionalidades (Regras de Negócio)
- **Filtro de Qualidade (4+ Estrelas):** Exclui sumariamente aplicativos com avaliações inferiores a 4.0, garantindo uma amostra de soluções validadas pelos usuários.
- **Detecção de Duplicatas:** Identifica quando o mesmo aplicativo aparece em buscas de diferentes palavras-chave, contabilizando-as e agrupando as tags de origem.
- **Matrizes Globais de Busca:** Botões de pesquisa em lote configurados com palavras-chave traduzidas (Português, Inglês, Espanhol e Francês) para contornar limitações regionais das lojas de aplicativos.
- **Extração de Metadados Ocultos:** Captura o número real de downloads, desenvolvedor, descrição completa e o ano de atualização.
- **Exportação Científica:** Geração de arquivo CSV formatado com codificação UTF-8 (BOM) e separador de ponto e vírgula, pronto para leitura limpa no Microsoft Excel.

---

## Stack Tecnológica e Arquitetura

O projeto adota uma arquitetura desacoplada (Frontend + Backend):

### Frontend (Vitrine visual)
- **Tecnologias:** React, TypeScript, Vite, CSS e Lucide Icons.
- **Hospedagem:** Vercel (Gera páginas estáticas em CDN de alta performance).

### Backend (Motor de extração)
- **Tecnologias:** Node.js, Express, TypeScript e `google-play-scraper`.
- **Hospedagem:** Render (Web Service ativo monitorando as requisições de raspagem).
- **Endpoint da API:** `https://api-appbench.onrender.com/api/search`

---

## Como rodar o projeto localmente

Para rodar este projeto na sua máquina para desenvolvimento, clone o repositório e siga os passos abaixo:

### 1. Inicializando a API (Servidor)
Abra um terminal na pasta raiz e navegue até o backend:
```bash
cd api
npm install
npm run dev