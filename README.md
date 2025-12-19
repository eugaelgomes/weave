# Weave Notes: Web App Full-Stack

<div align="center">

[![Deploy Status](https://img.shields.io/badge/deploy-ativo-brightgreen)](https://notes.gaelgomes.dev/)
[![Docker](https://img.shields.io/badge/Docker-100%25-blue?logo=docker)](https://docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green?logo=nodedotjs)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-15+-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Live deploy **[https://notes.gaelgomes.dev](https://notes.gaelgomes.dev/)**

Web app full stack para gerenciamento de notas e anotações de usuários, com criação e edição de conteúdos em diferentes formatos, incluindo texto, código, parágrafos e listas. Além disso o app conta com função de compartilhamento de notas com outros usuários e mapeamento de tags/palavras chaves. 
</div>

---

# Funcionalidades

### 📝 **Gerenciamento de Notas**

- CRUD do fluxos de notas
- Sistema de blocos e categorização ( texto, código, parágrafo, ...)
- Interface drag-and-drop
- Pesquisa e filtros de notas e páginas
- Backup e exclusão total por parte do usuário

### 🔐 **Autenticação & Segurança**

- Sistema completo de autenticação JWT
- Integração com Google OAuth 2.0 - *ainda em autorização do app junto ao Google*
- Integração com Github OAuth  - *em desenvolvimento*
- Cookies HttpOnly
- Middleware de autenticação e validação de dados
- Rate limiting e proteção CORS

### 🔧 **DevOps & Infraestrutura**

- Dockerizado (desenvolvimento e produção)
- Hot-reload com Docker Compose Watch
- CI/CD
- Proxy reverso com Nginx - para deplay em container

---

## 🛠️ Stacks

### **Frontend**

```javascript
Next.JS 15        // Framework de frontend
TailwindCSS       // Framework CSS
Axios             // HTTP client
Next Router      // Roteamento
```

### **Backend**

```javascript
Node.js           // Runtime
Express.js 4.21   // Framework web
JavaScript        // Linguagem principal
JWT               // Autenticação
Nodemailer        // Envio de emails
AWS S3 - DO       // Storage de arquivos
PostgreSQL        // Banco de Dados Relacional
```

### **DevOps**

```yaml
Docker            # Containerização
Docker Compose    # Orquestração
Nginx             # Proxy reverso
Multi-stage       # Builds otimizados
Hot-reload        # Desenvolvimento ágil
```

---

### Pré-requisitos

- [Docker](https://www.docker.com/get-started) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

### Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/eugaelgomes/notes-web-app.git
cd notes-web-app

# Configure as variáveis de ambiente
cp docker-compose.override.example.yml docker-compose.override.yml

# Inicie o ambiente de desenvolvimento
docker compose up --build

# Acesse a aplicação
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
```

### Produção

```bash
# Build das imagens de produção
docker compose -f docker-compose.yml build

# Deploy em produção
docker compose -f docker-compose.yml up -d
```

---

## 📂 Estrutura do Projeto

```
notes-web-app/
├── 🖥️  web/                    # Frontend Next.js
│   ├── app/
│   │   ├── components/        # Componentes reutilizáveis
│   │   │   ├── layout/       # Componentes de layout
│   │   │   └── ui/           # Componentes de UI
│   │   ├── contexts/         # Context API (Auth, Notes)
│   │   ├── services/         # Serviços e API clients
│   │   │   ├── auth-service/
│   │   │   ├── backup-service/
│   │   │   └── notes-service/
│   │   ├── utils/            # Utilitários
│   │   ├── auth/             # Páginas de autenticação
│   │   ├── app/              # Páginas da aplicação
│   │   │   ├── home/
│   │   │   ├── notes/
│   │   │   ├── organization/
│   │   │   └── settings/
│   │   └── about/            # Página sobre
│   ├── config/
│   │   └── nginx.conf        # Configuração Nginx
│   ├── public/               # Arquivos estáticos
│   ├── types/                # Definições TypeScript
│   ├── Dockerfile            # Container frontend
│   └── package.json
│
├── ⚙️  server/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/      # Controladores das rotas
│   │   │   ├── auth/
│   │   │   ├── backup/
│   │   │   ├── notes/
│   │   │   ├── password/
│   │   │   └── user/
│   │   ├── middlewares/      # Middlewares personalizados
│   │   │   ├── auth/
│   │   │   ├── data/
│   │   │   └── security/
│   │   ├── repositories/     # Camada de dados
│   │   ├── routes/           # Definição das rotas
│   │   ├── services/         # Serviços (DB, Email, Storage)
│   │   │   ├── db/
│   │   │   ├── email/
│   │   │   ├── jobs/
│   │   │   └── storage/
│   │   └── config/           # Configurações
│   ├── docs/                 # Documentação da API
│   ├── temp/                 # Arquivos temporários
│   ├── Dockerfile            # Container backend
│   └── package.json
│
├── 🐳 docker-compose.yml       # Orquestração principal
├── 🔧 docker-compose.override.yml # Configurações locais
└── 📋 PRODUCTION_SETUP.md     # Guia de produção
```

---

## ⚡ Hot-Reload

**Docker Compose Watch** para sincronização em tempo real:

```yaml
develop:
  watch:
    - action: sync          # Sincroniza mudanças
      path: ./src
      target: /app/src
    - action: rebuild       # Rebuild em mudanças críticas
      path: ./package.json
```
---

<div align="center">

**Feito em algumas madrugadas por [Gael Gomes](https://github.com/eugaelgomes)**

[https://notes.gaelgomes.dev](https://notes.gaelgomes.dev/) • [hello@gaelgomes.dev](mailto:hello@gaelgomes.dev) • [in/gael-rene-gomes](https://linkedin.com/in/gael-rene-gomes)

</div>
