# Weave Notes - AI Agent Instructions

## Architecture Overview

**Monorepo Structure**: Full-stack app with Docker Compose orchestration
- `server/`: Node.js/Express backend (port 8080) - JavaScript with some TypeScript
- `web/`: Next.js 15 frontend (port 3000) - TypeScript/React with App Router
- PostgreSQL database with pg pool connections
- AWS S3 (DigitalOcean Spaces) for file storage
- Google Gemini AI integration for chat features

## Development Workflow

### Starting the App
```bash
docker compose up --build  # Full stack with hot-reload via Docker Compose Watch
```

### Running Components Individually
```bash
cd server && npm run dev    # Backend with nodemon + ts-node
cd web && npm run dev       # Frontend with Next.js dev server
```

### Building for Production
```bash
cd server && npm run build  # Babel transpilation (src → dist)
cd web && npm run build     # Next.js production build
```

## Backend Patterns (server/)

### Path Aliases
Use `@/` prefix for all internal imports (configured via `module-alias`):
```javascript
const { pool } = require('@/services/db/index');
const authController = require('@/controllers/authentication/auth-controller');
```

### Layered Architecture
**Routes → Controllers → Repositories → Database**

- **Routes** (`src/routes/*.routes.js`): Express routers mounted at `/api` prefix
- **Controllers** (`src/controllers/*`): Business logic, validation, HTTP responses
  - Use class-based controllers with methods for each endpoint
  - Validation methods prefixed with `_validate` (e.g., `_validateAuthentication`)
- **Repositories** (`src/repositories/*.js`): Database queries using `executeQuery()` or `rowCount()`
- **Services** (`src/services/`): External integrations (email, storage, AI)

### Database Access
```javascript
const { executeQuery, rowCount } = require('@/services/db/index');

// Always use parameterized queries ($1, $2, ...)
const results = await executeQuery(
  'SELECT * FROM notes WHERE user_id = $1 AND status = $2',
  [userId, 'open']
);
```

### Error Handling
Global error handler in `middlewares/error-handler.js` catches all errors. Controllers should throw descriptive errors:
```javascript
if (!note) {
  throw new Error('Nota não encontrada');
}
```

### Authentication
- JWT tokens stored in HttpOnly cookies
- Middleware validates `req.user.userId` on protected routes
- CORS configured with dynamic whitelist in `middlewares/global-middleware.js`

## Frontend Patterns (web/)

### Context Architecture
Conditional provider system based on authentication state:
- **AuthContext** → **ConditionalProviders** → **AuthenticatedProviders**
- Authenticated contexts (Notes, Projects, Organizations, Chat) only load when user is logged in
- See `app/contexts/ConditionalProviders.tsx` for implementation

### API Communication
Centralized API client in `app/services/api-methods.ts`:
```typescript
import { ApiClient, API_ENDPOINTS } from '@/services';

const response = await ApiClient.get(API_ENDPOINTS.NOTES);
// All requests include credentials: 'include' for cookies
```

### Route Organization
- Public routes: `app/auth/*`, `app/about/`
- Protected routes: `app/app/*` (notes, projects, settings, weave-ai)
- Layout hierarchy: Root layout → App layout (`app/app/layout.tsx`)

### Styling
TailwindCSS with custom configuration. Use utility classes directly in components.

## Key Conventions

1. **Backend**: CommonJS (`require`/`module.exports`) for .js files, ES6 imports for .ts files
2. **Frontend**: ES6 modules (`import`/`export`) exclusively
3. **Error responses**: Return JSON with `{ error: "message" }` format
4. **IDs**: PostgreSQL bigint converted to strings in queries (`id::text`)
5. **Collaborators**: Notes support multi-user collaboration via `notes_collaborators` table
6. **Tags**: Stored as PostgreSQL arrays (`text[]`)

## Important Files

- `server/src/app.js`: Express app configuration and middleware setup
- `server/src/middlewares/global-middleware.js`: CORS, helmet, session config
- `server/docs/base.md`: Detailed technical documentation
- `web/app/layout.tsx`: Root layout with provider initialization
- `docker-compose.yml`: Service orchestration with hot-reload configuration

## External Dependencies

- **Nodemailer**: Email notifications (collaboration invites, password reset)
- **AWS SDK**: S3-compatible storage for avatars and attachments
- **Google Generative AI**: Gemini models for AI chat functionality
- **Passport.js**: OAuth integration (Google, GitHub - in progress)
