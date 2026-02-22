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

## Estrutura do Projeto

```
notes-web-app/
├── 🖥️  web/                          # Frontend Next.js 15
│   ├── app/
│   │   ├── about/                   # Página institucional
│   │   ├── app/                     # Páginas protegidas da aplicação
│   │   │   ├── components/          # Componentes internos do app
│   │   │   │   ├── auth/           # Componentes de autenticação
│   │   │   │   ├── layout/         # Componentes de layout
│   │   │   │   └── ui/             # Componentes de UI
│   │   │   ├── home/               # Dashboard / Home
│   │   │   ├── hooks/              # Custom hooks
│   │   │   ├── notes/              # Gerenciamento de notas
│   │   │   ├── notifications/      # Sistema de notificações
│   │   │   ├── organization/       # Organizações
│   │   │   ├── projects/           # Projetos
│   │   │   ├── settings/           # Configurações do usuário
│   │   │   └── weave-ai/           # Chat com IA (Weave AI)
│   │   ├── auth/                    # Páginas de autenticação
│   │   │   ├── activate/           # Ativação de conta
│   │   │   ├── modals/             # Modais de autenticação
│   │   │   ├── reset-password/     # Recuperação de senha
│   │   │   ├── signin/             # Login
│   │   │   └── signup/             # Cadastro
│   │   ├── contexts/                # Context API (providers)
│   │   │   ├── AuthContext          # Autenticação
│   │   │   ├── ChatContext          # Chat com IA
│   │   │   ├── NotesContext         # Notas
│   │   │   ├── OrganizationContext  # Organizações
│   │   │   ├── ProjectsContext      # Projetos
│   │   │   └── ThemeContext         # Tema claro/escuro
│   │   ├── home/                    # Landing page
│   │   ├── services/                # Serviços e API clients
│   │   │   ├── ai-agent-service/   # Serviço de IA
│   │   │   ├── authentication/     # Serviço de autenticação
│   │   │   ├── backup-service/     # Serviço de backup
│   │   │   ├── health-service/     # Health check
│   │   │   ├── notes-service/      # Serviço de notas
│   │   │   ├── organization/       # Serviço de organizações
│   │   │   └── projects-service/   # Serviço de projetos
│   │   └── utils/                   # Utilitários (format, tags, etc.)
│   ├── components/ui/               # Componentes UI compartilhados
│   ├── config/
│   │   └── nginx.conf               # Configuração Nginx
│   ├── lib/                         # Funções utilitárias
│   ├── public/                      # Arquivos estáticos
│   ├── types/                       # Definições TypeScript
│   ├── Dockerfile                   # Container frontend
│   └── package.json
│
├── ⚙️  server/                       # Backend Node.js/Express
│   ├── src/
│   │   ├── app.js                   # Configuração do Express
│   │   ├── index.js                 # Entry point
│   │   ├── routes.js                # Registro de rotas
│   │   ├── config/                  # Configurações (CORS, aliases)
│   │   ├── middlewares/             # Middlewares personalizados
│   │   │   ├── authentication/     # Validação JWT
│   │   │   ├── data/               # Validação e upload de dados
│   │   │   └── security/           # Rate limiting, sessão, IP
│   │   ├── modules/                 # Módulos da aplicação
│   │   │   ├── auth/               # Autenticação (controller, repository, routes)
│   │   │   ├── backup/             # Backup de dados
│   │   │   ├── notes/              # Notas e blocos
│   │   │   ├── organizations/      # Organizações
│   │   │   ├── password/           # Recuperação de senha
│   │   │   ├── plans/              # Planos de assinatura
│   │   │   ├── projects/           # Projetos
│   │   │   ├── users/              # Gerenciamento de usuários
│   │   │   └── weave-ai/           # Chat com IA
│   │   ├── services/                # Serviços externos
│   │   │   ├── db/                 # Pool PostgreSQL
│   │   │   ├── email/              # Nodemailer (templates)
│   │   │   ├── jobs/               # Tarefas agendadas
│   │   │   ├── note_export/        # Exportação de notas (PDF)
│   │   │   ├── patterns/           # Padrões de produto
│   │   │   ├── plans/              # Gerenciamento de planos
│   │   │   ├── secrets/            # Gerenciamento de segredos
│   │   │   ├── storage/            # AWS S3 / DigitalOcean Spaces
│   │   │   └── weave-ai/           # Google Gemini AI
│   │   └── utils/                   # Utilitários e logs
│   ├── db_docs/                     # Documentação do banco de dados
│   ├── docs/                        # Documentação da API
│   ├── Dockerfile                   # Container backend
│   └── package.json
│
├── 🐳 docker-compose.yml            # Orquestração principal
├── 🔧 docker-compose.override.yml   # Configurações locais
└── 📄 README.md
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

## Uso de IA

Sim, utilizei IA durante o desenvolvimento deste projeto — e sem medo! Ferramentas de IA foram usadas como apoio para acelerar a escrita de código, gerar ideias e resolver problemas. Porém é ***importante estudo, contexto e método***. IA é uma ferramenta poderosa e rápida, mas o entendimento e a responsabilidade sobre o que é construído continuam sendo meu.

---

<div align="center">

**Feito em algumas madrugadas por [Gael Gomes](https://github.com/eugaelgomes)**

[https://notes.gaelgomes.dev](https://notes.gaelgomes.dev/) • [hello@gaelgomes.dev](mailto:hello@gaelgomes.dev) • [in/gael-rene-gomes](https://linkedin.com/in/gael-rene-gomes)

</div>
