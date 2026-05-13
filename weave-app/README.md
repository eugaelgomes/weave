# Weave Notes — Front end

Web UI for Weave Notes, built with Next.js, React 19, and Tailwind CSS.

[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

The **Weave Notes** front end is a Next.js application for structured work: block-based notes, drag-and-drop, collaboration, and Weave AI chat.

## Technologies

| Technology         | Version | Usage                          |
| ------------------ | ------- | ------------------------------ |
| **Next.js**        | 16+     | React framework (App Router)   |
| **React**          | 19      | UI library                     |
| **TypeScript**     | 5+      | Static typing                  |
| **Tailwind CSS**   | 4+      | Utility-first styling          |
| **@dnd-kit**       | 6+      | Drag and drop                  |
| **react-markdown** | 10+     | Markdown rendering             |
| **lucide-react**   | —       | Icons                          |
| **sonner**         | 2+      | Toast notifications            |
| **next-themes**    | —       | Light / dark theme             |

## Directory layout

```text
weave-app/
├── app/
│   ├── (public)/           # Landing, auth, activation (no app shell)
│   ├── (protected)/       # Authenticated area (AppShell)
│   ├── _components/       # Shared shell and small UI pieces
│   ├── _contexts/         # Providers (auth, notes, projects, chat, …)
│   ├── _services/         # HTTP client, API_ENDPOINTS, domain services
│   ├── _i18n/             # Locale strings
│   └── _utils/            # Shared helpers
├── public/                # Static assets
├── Dockerfile             # Production container (optional)
└── package.json
```

Feature UI is colocated under route folders (for example `app/(protected)/notes/[id]/_components`).

## Architecture

### Context providers

Conditional providers depend on authentication state:

```text
AuthContext → ConditionalProviders → AuthenticatedProviders
                                      ├── NotesContext (and related)
                                      ├── ProjectsContext
                                      ├── OrganizationContext
                                      ├── ChatContext
                                      └── ThemeContext
```

Authenticated-only providers mount after the user is signed in.

### API client

- Central client: [`app/_services/api-methods.ts`](app/_services/api-methods.ts) (`apiClient`, `API_ENDPOINTS`, `API_BASE_URL`).
- Barrel exports: [`app/_services/index.ts`](app/_services/index.ts).
- Errors: [`app/_services/api-error.ts`](app/_services/api-error.ts).
- Requests use `credentials: "include"` where cookies are required.

### Routes (high level)

| Route pattern              | Type        | Description                    |
| -------------------------- | ----------- | ------------------------------ |
| `/`                        | Public      | Landing                        |
| `/auth`, `/activate`       | Public      | Sign-in, sign-up, activation   |
| `/home`                    | Protected   | Dashboard                      |
| `/notes`, `/notes/[id]`    | Protected   | Notes                          |
| `/projects`, `/projects/*` | Protected   | Projects                       |
| `/organization/*`          | Protected   | Organization admin and areas |
| `/settings/*`              | Protected   | User and workspace settings    |
| `/weave-ai/*`              | Protected   | AI chat and agents             |
| `/notifications/*`       | Protected   | Notifications                  |
| `/calendar`                | Protected   | Calendar                       |

Exact URLs follow the App Router file tree under `app/(public)` and `app/(protected)`.

## Getting started

### Prerequisites

- Node.js 20+ (aligned with API CI; use 22+ if that is your team standard)
- npm or yarn

### Development

```bash
npm install
cp .env.example .env   # set NEXT_PUBLIC_API_BASE_URL and related vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run build
npm start
```

### Backend stack (monorepo root)

The Next.js app is **not** defined in the root [`docker-compose.yml`](../docker-compose.yml) services list. Run the API, worker, and engine with Compose from the repo root, and run this package locally with `npm run dev`, or containerize `weave-app` in your own override or deployment pipeline.

**Docker dev (`Dockerfile.dev`):** the image sets `WEAVE_APP_AUTO_DEPS=1`. On container start, if `package-lock.json` is present and `npm ls --depth=0` fails (for example because `./weave-app:/app` bind-mount replaced `node_modules`), the entrypoint runs **`npm ci`** so you do not need `npm install` on the host. Commit an updated `package-lock.json` whenever `package.json` dependencies change, then **`docker compose build --no-cache`** (or rebuild the web service) so the image receives the new lockfile.

For faster iteration, you can still use a **named volume** for `node_modules` so the bind mount does not overwrite installed packages:

```yaml
volumes:
  - ./weave-app:/app
  - weave_app_node_modules:/app/node_modules
```

```bash
cd ..
docker compose up --build
```

## Scripts

| Script                 | Description                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Dev server with hot reload     |
| `npm run build`        | Production build               |
| `npm start`            | Production server              |
| `npm run lint`         | ESLint                         |
| `npm run lint:fix`     | ESLint with fixes              |
| `npm run format`       | Prettier write                 |
| `npm run format:check` | Prettier check                 |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

© 2025–2026 Gael Renê Gomes. All rights reserved under the MIT License terms.

## Author

**Gael Renê Gomes**

- Email: [hello@gaelgomes.dev](mailto:hello@gaelgomes.dev)
- Website: [gaelgomes.dev](https://gaelgomes.dev)
- GitHub: [@eugaelgomes](https://github.com/eugaelgomes)
