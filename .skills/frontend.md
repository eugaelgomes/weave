# Next.js Frontend Skill

Use this skill when inspecting, designing, or modifying code in the `web/` directory.

The `web/` workspace is a Next.js (App Router) client application built with React, TypeScript, Tailwind CSS, and Radix/shadcn UI components. It interfaces directly with `server/` via standard HTTP REST APIs and streaming channels.

---

## Workspace Structure

The `web/app/` directory utilizes Next.js App Router route groups and private folder conventions (folders prefixed with `_` are excluded from route generation):

- `app/(protected)/`: Authentication-guarded screens and dashboard views (Workspaces, Projects, Settings).
- `app/(public)/`: Publicly accessible screens (Landing pages, Auth flows, SSO callbacks).
- `app/_assets/`: Local static assets, custom SVG icons, and typography.
- `app/_components/`: Reusable React components (`_components/ui/` for core primitives, `_components/weave-ai/` for AI interfaces).
- `app/_contexts/`: React Context providers managing client-side global state (Auth, Theme, Workspace, Notifications).
- `app/_i18n/`: Internationalization translation files, string maps, and language switchers.
- `app/_services/`: Centralized HTTP API clients (`api-methods.ts`), error parsing (`api-error.ts`), and feature-specific services (e.g. `notes-service`, `plans-service`, `authentication`).
- `app/_utils/`: Frontend-specific utility functions (e.g. class merging via `cn`, date formatters).
- `app/globals.css`: Primary CSS file defining Tailwind directives, design tokens, and CSS variable themes.
- `public/`: Publicly served static assets (favicons, manifest assets).

---

## Server vs. Client Component Boundaries

Next.js App Router uses React Server Components (RSC) by default:

### 1. Server Components (Default)
- Use Server Components for pages, static layouts, and non-interactive UI elements.
- Performs data fetching on the server with zero client JS overhead.
- **Rule:** Do NOT use React hooks (`useState`, `useEffect`, `useContext`) or browser event listeners in Server Components.

### 2. Client Components (`"use client"`)
- Place `"use client"` at the top of files that require reactivity, custom state hooks, DOM event handlers, or browser APIs.
- Keep Client Components at the leaves of your component tree to minimize client bundle size.

---

## API Communication & Data Fetching (`app/_services/`)

- All HTTP requests to `server/` MUST use the central API helpers in `app/_services/api-methods.ts`.
- Wrap API exceptions using `app/_services/api-error.ts` to present consistent error feedback to the user.
- Handlers MUST properly manage session invalidation triggers (`session-invalidation.ts`) on 401/403 HTTP status codes.
- **Data Caching:** Use SWR or React Query hooks for client-side data fetching, automatic revalidation, and optimistic updates.

---

## UI Design & Styling Guidelines

1. **Tailwind CSS & Token Usage:** Stick strictly to Tailwind utility classes. Use CSS variables defined in `globals.css` for theme colors.
2. **Class Merging:** Always use the `cn(...)` utility (`clsx` + `tailwind-merge`) when conditionally merging dynamic class names into components.
3. **Rich Aesthetics:** Ensure a modern, state-of-the-art UI:
   - Use curated color palettes with dark mode support.
   - Add subtle micro-animations and smooth transition effects for hover/active states.
   - Incorporate proper skeleton loaders (`loading.tsx`) and error fallback states (`error.tsx`).
4. **No Raw CSS/Inline Styles:** Avoid writing custom SCSS or inline `style` objects unless calculating purely dynamic runtime pixel offsets.

---

## SEO & App Metadata Standards

- Include proper metadata exports (`title`, `description`, `openGraph`) in `layout.tsx` and page components.
- Maintain site indexing infrastructure: `sitemap.ts`, `robots.ts`, and web app manifests (`manifest.ts`).
- Enforce strict semantic HTML5 tags (`<main>`, `<nav>`, `<header>`, `<footer>`) with a single `<h1>` tag per route.

---

## Code Quality & Import Conventions

- **Path Aliases:** Use project path aliases (`@/app/_components/...`, `@/app/_services/...`, `@/lib/...`).
- **No Barrel Files:** Do not create `index.ts` re-export files in component or service directories. Import target files explicitly.
- **English Documentation:** Write all code comments, docstrings, and JSDoc strictly in English.

