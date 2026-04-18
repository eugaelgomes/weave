# App Router Structure

This project is being migrated to a feature-oriented App Router structure for Next.js 16.

## Current status

- Global app providers live in `app/layout.tsx`.
- Protected shell composition is centralized in `app/_components/layout/app-shell.tsx`.
- Protected visual layout is centralized in `app/_components/layout/protected-layout.tsx`.
- Auth locale files now follow consistent casing (`pt-BR`, `en-US`, `es-ES`).
- Public entry route is now in `app/(public)/page.tsx`.
- Auth route is now in `app/(auth)/auth/page.tsx`.
- Protected layout for migrated routes is in `app/(protected)/app/layout.tsx`.
- Home route is now in `app/(protected)/app/home/page.tsx`.
- Notifications routes are now in `app/(protected)/app/notifications`.
- Calendar routes are now in `app/(protected)/app/calendar`.

## Target structure

- `app/(public)` for marketing and public redirects.
- `app/(auth)` for sign-in and sign-up flows.
- `app/(protected)` for authenticated areas.
- Keep shared non-route code outside route folders when possible.

## Migration order

1. Consolidate duplicated layouts and headers (done).
2. Move route segments to route groups without changing URLs (in progress).
3. Migrate shared code from route folders to `src/` gradually.
4. Remove legacy aliases and dead files.
