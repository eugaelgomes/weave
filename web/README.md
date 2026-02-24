# 🖥️ Weave Notes - Front-End

> Interface web do Weave Notes, construída com Next.js, React 19 e TailwindCSS.

[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Visão Geral

Frontend do **Weave Notes** — um web app full-stack para gerenciamento de notas estruturadas com sistema de blocos, drag-and-drop, compartilhamento colaborativo e chat com IA.

## Tecnologias

| Tecnologia         | Versão | Uso                            |
| ------------------ | ------ | ------------------------------ |
| **Next.js**        | 16+    | Framework React com App Router |
| **React**          | 19     | Biblioteca UI                  |
| **TypeScript**     | 5+     | Tipagem estática               |
| **TailwindCSS**    | 4+     | Estilização utility-first      |
| **@dnd-kit**       | 6+     | Drag and drop                  |
| **react-markdown** | 10+    | Renderização Markdown          |
| **lucide-react**   | -      | Ícones                         |
| **sonner**         | 2+     | Notificações toast             |
| **next-themes**    | -      | Tema claro/escuro              |

## Estrutura de diretórios

```
web/
├── app/
│   ├── about/                    # Página institucional
│   ├── home/                     # Landing page
│   ├── auth/                     # Páginas de autenticação
│   │   ├── activate/            # Ativação de conta
│   │   ├── signin/              # Login
│   │   ├── signup/              # Cadastro
│   │   ├── reset-password/      # Recuperação de senha
│   │   └── modals/              # Modais de autenticação
│   ├── app/                      # Páginas protegidas (autenticado)
│   │   ├── home/                # Dashboard
│   │   ├── notes/               # Gerenciamento de notas
│   │   │   └── view/           # Visualização de nota
│   │   ├── projects/            # Projetos
│   │   │   └── view/           # Visualização de projeto
│   │   ├── organization/        # Organizações
│   │   │   ├── members/        # Membros
│   │   │   ├── projects/       # Projetos da org
│   │   │   └── settings/       # Configurações da org
│   │   ├── notifications/       # Notificações
│   │   ├── settings/            # Configurações do usuário
│   │   ├── weave-ai/            # Chat com IA
│   │   │   ├── agent/          # Agente IA
│   │   │   └── chat/           # Interface de chat
│   │   ├── hooks/               # Custom hooks
│   │   └── components/          # Componentes do app
│   │       ├── auth/           # Componentes de auth
│   │       ├── layout/         # Layout (sidebar, header)
│   │       └── ui/             # Componentes de UI
│   ├── contexts/                 # Context API (providers)
│   │   ├── AuthContext          # Estado de autenticação
│   │   ├── NotesContext         # Estado de notas
│   │   ├── ProjectsContext      # Estado de projetos
│   │   ├── OrganizationContext  # Estado de organizações
│   │   ├── ChatContext          # Estado do chat IA
│   │   └── ThemeContext         # Tema claro/escuro
│   ├── services/                 # Camada de comunicação com API
│   │   ├── ai-agent-service/    # Serviço de IA
│   │   ├── authentication/      # Serviço de autenticação
│   │   ├── backup-service/      # Serviço de backup
│   │   ├── health-service/      # Health check
│   │   ├── notes-service/       # Serviço de notas
│   │   ├── organization/        # Serviço de organizações
│   │   └── projects-service/    # Serviço de projetos
│   └── utils/                    # Utilitários
├── components/ui/                # Componentes UI compartilhados (shadcn)
├── config/
│   └── nginx.conf                # Configuração Nginx (produção)
├── lib/                          # Funções utilitárias
├── public/                       # Arquivos estáticos
├── types/                        # Definições TypeScript globais
├── Dockerfile                    # Container de produção
└── package.json
```

## ⚙️ Arquitetura

### Context Providers

Sistema condicional de providers baseado no estado de autenticação:

```
AuthContext → ConditionalProviders → AuthenticatedProviders
                                      ├── NotesContext
                                      ├── ProjectsContext
                                      ├── OrganizationContext
                                      ├── ChatContext
                                      └── ThemeContext
```

Os contexts autenticados só são carregados quando o usuário está logado.

### Comunicação com API

Cliente centralizado em `services/api-methods.ts`:

- Todas as requisições incluem `credentials: 'include'` para cookies HttpOnly
- Endpoints definidos em `services/index.ts`
- Tratamento de erros via `api-error.ts`

### Rotas

| Rota                 | Tipo      | Descrição                 |
| -------------------- | --------- | ------------------------- |
| `/`                  | Pública   | Landing page              |
| `/about`             | Pública   | Página institucional      |
| `/auth/*`            | Pública   | Login, cadastro, ativação |
| `/app`               | Protegida | Dashboard                 |
| `/app/notes`         | Protegida | Gerenciamento de notas    |
| `/app/projects`      | Protegida | Projetos                  |
| `/app/organization`  | Protegida | Organizações              |
| `/app/settings`      | Protegida | Configurações             |
| `/app/weave-ai`      | Protegida | Chat com IA               |
| `/app/notifications` | Protegida | Notificações              |

## Iniciação do projeto

### Pré-requisitos

- Node.js 22+
- npm ou yarn

### Desenvolvimento

```bash
# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Produção

```bash
# Build de produção
npm run build

# Iniciar servidor
npm start
```

### Via Docker (recomendado)

```bash
# Na raiz do monorepo
docker compose up --build
```

## 📜 Scripts

| Script                 | Descrição                                  |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Servidor de desenvolvimento com hot-reload |
| `npm run build`        | Build de produção                          |
| `npm start`            | Servidor de produção                       |
| `npm run lint`         | Verificação de lint                        |
| `npm run lint:fix`     | Correção automática de lint                |
| `npm run format`       | Formatação com Prettier                    |
| `npm run format:check` | Verificação de formatação                  |

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

© 2025-2026 Gael Renê Gomes. Todos os direitos reservados sob os termos da licença MIT.

## Autor

**Gael Renê Gomes**

- 📧 Email: [hello@gaelgomes.dev](mailto:hello@gaelgomes.dev)
- 🌐 Website: [gaelgomes.dev](https://gaelgomes.dev)
- GitHub: [@eugaelgomes](https://github.com/eugaelgomes)
