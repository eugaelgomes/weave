# Weave Notes

Monorepo com os servicos principais do ecossistema Weave Notes:

- `weave-app`: frontend Next.js
- `weave-api`: API REST (Node.js/Express)
- `weave-worker`: processamento assincrono e jobs
- `weave-engine`: servico de engine/IA

Deploy oficial: [https://weavenotes.app](https://weavenotes.app/)

## Estrutura do repositorio

```text
weave-notes/
├── weave-app/
├── weave-api/
├── weave-worker/
├── weave-engine/
├── compose.server.yml
├── compose.worker.yml
├── compose.engine.yml
├── docker-compose.yml
└── docker-compose.override-example
```

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **API**: Node.js + Express 4
- **Dados/infra**: PostgreSQL, Redis, Docker Compose
- **IA**: Google Gemini (`@google/generative-ai`)

## Desenvolvimento local

### Pre-requisitos

- Docker + Docker Compose v2
- Node.js 20+ (recomendado para execucao local sem Docker)

### Rodando com Docker Compose (ambiente integrado)

1. Crie o override local:

```bash
cp docker-compose.override-example docker-compose.override.yml
```

2. Suba os servicos:

```bash
docker compose up --build
```

3. Subir servicos individualmente (opcional):

```bash
docker compose up server --build
docker compose up web --build
docker compose up worker --build
```

> O `docker-compose.yml` traz base de producao; o `docker-compose.override.yml` (local) habilita fluxo de desenvolvimento.

### Rodando sem Docker

Abra um terminal por servico e execute:

```bash
# API
cd weave-api
npm install
npm run dev

# Frontend
cd weave-app
npm install
npm run dev

# Worker
cd weave-worker
npm install
npm run dev

# Engine
cd weave-engine
npm install
npm run dev
```

## Comandos uteis

### API (`weave-api`)

```bash
npm run dev
npm run build
npm run start
npm run check
npm test
```

### Frontend (`weave-app`)

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
```

### Worker (`weave-worker`)

```bash
npm run dev
npm run start
npm run lint
npm run format
```

### Engine (`weave-engine`)

```bash
npm run dev
npm run start
npm run lint
npm run format
```

## Variaveis de ambiente

Cada servico possui seu proprio `.env`:

- `weave-api/.env`
- `weave-worker/.env`
- `weave-engine/.env`

No ambiente Docker de desenvolvimento, parte da configuracao tambem e injetada via `docker-compose.override.yml` (ex.: URLs internas entre API e Worker e token interno compartilhado).

Variaveis que aparecem explicitamente na configuracao de desenvolvimento:

- `NODE_ENV`
- `WORKER_BASE_URL`
- `WORKER_REQUEST_ORIGIN`
- `WORKER_INTERNAL_TOKEN`
- `SERVER_BASE_URL`
- `WORKER_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `DUE_DATE_REMINDER_ENABLED`
- `DUE_DATE_REMINDER_HOUR_UTC`

## Deploy

O repositorio usa GitHub Actions com deploy por SSH em pushes na branch `main`:

- `.github/workflows/deploy-server.yml`
- `.github/workflows/deploy-worker.yml`

### Pipeline da API

- valida build em `weave-api`
- conecta via SSH no host remoto
- atualiza o repositorio
- executa `docker compose -f compose.server.yml up -d --build`

### Pipeline do Worker

- valida instalacao em `weave-worker`
- conecta via SSH no host remoto
- atualiza o repositorio
- executa `docker compose -f compose.worker.yml up -d --build`

## Compose de producao por servico

- `compose.server.yml`: Caddy + API (`weave-api`)
- `compose.worker.yml`: Worker (`weave-worker`)
- `compose.engine.yml`: Engine (`weave-engine`)

## Troubleshooting rapido

### Porta ocupada

```bash
docker compose down
```

Se necessario, valide processos locais nas portas usadas (ex.: `3000`, `8080`, `8081`).

### Alteracoes nao refletidas

```bash
docker compose up --build
```

Se persistir:

```bash
docker compose down -v
docker compose up --build
```

### Logs de um servico

```bash
docker compose logs -f server
docker compose logs -f web
docker compose logs -f worker
```

## Licenca

MIT. Veja `LICENSE`.
