# Middlewares

Referência dos middlewares do servidor, organizados por categoria.

---

## Índice

1. [Middlewares Globais](#1-middlewares-globais)
2. [Autenticação](#2-autenticação)
3. [Validação de Dados](#3-validação-de-dados)
4. [Segurança](#4-segurança)
5. [Tratamento de Erros](#5-tratamento-de-erros)
6. [Utilitários de Imagem](#6-utilitários-de-imagem)

---

## 1. Middlewares Globais

### `global-middleware.js`

Exporta `configureGlobalMiddlewares(app)` que aplica os middlewares na ordem:

1. `cookieParser()`
2. `sessionMiddleware` (sessão PostgreSQL)
3. `express.urlencoded({ extended: true })` + `express.json()`
4. `app.set("trust proxy", 1)`
5. `getClientIp` (extração de IP real)
6. `cors(...)` (configuração dinâmica)
7. `helmet(...)` (headers de segurança)

#### CORS — `makeCorsOptions()`

A whitelist vem de `allowedOrigins` em `@/config/allowed-origins`. Origens com `*` são convertidas em regex via `buildMatcher()`.

| Propriedade | Valor |
|-------------|-------|
| `credentials` | `true` |
| `methods` | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| `allowedHeaders` | Content-Type, Authorization, X-Requested-With, Accept, Cookie |
| `exposedHeaders` | Content-Range, X-Content-Range, Set-Cookie |
| `maxAge` | 600 (10 min preflight cache) |
| `optionsSuccessStatus` | 204 |

**Comportamento por ambiente:**

- **Dev**: aceita `localhost` e `127.0.0.1` em qualquer porta; aceita requests sem header `Origin`
- **Produção**: rejeita requests sem `Origin`; bloqueia origens fora da whitelist

#### Helmet

```javascript
{
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", process.env.TRUSTED_CDN || "'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}
```

**Variáveis de Ambiente:** `ALLOWED_ORIGINS`, `NODE_ENV`, `TRUSTED_CDN`

---

## 2. Autenticação

### `authentication/index.js`

#### `verifyToken(req, res, next)`

Valida JWT de acesso. Busca token nesta ordem:

1. Cookie `token` (HttpOnly)
2. Header `Authorization: Bearer <token>`

Decodifica com `jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] })` e anexa payload em `req.user`.

| Status | Condição | Mensagem |
|--------|----------|----------|
| 401 | Token ausente | "Acesso negado. Token não fornecido." |
| 401 | Token inválido/expirado | "Token inválido ou expirado." |

**Payload decodificado disponível em `req.user`:**
`{ userId, username, email, name, org_id, org_unique_name, plan_id, org_member_role }`

**Variável de Ambiente:** `SECRET_KEY`

---

## 3. Validação de Dados

### `data/input-validation.js`

Exporta duas funções que retornam arrays de validadores `express-validator`:

#### `inputValidation()` — criação/atualização de conta

| Campo | Regras |
|-------|--------|
| `name` | Opcional. Letras unicode + espaços, 1-100 chars, trim + escape |
| `user_name` | Opcional. Mesmas regras de `name` |
| `username` | Obrigatório. `[a-zA-Z0-9._-]`, 6-18 chars, toLowerCase + escape |
| `email` | Obrigatório. `isEmail()` + `normalizeEmail()` |
| `password` | Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, símbolos opcionais |

#### `loginValidation()` — login

| Campo | Regras |
|-------|--------|
| `login` | Obrigatório. 3-255 chars, trim + escape |
| `password` | Obrigatório. notEmpty, trim |

---

### `data/stringfy.js`

#### `toString(req, res, next)`

Converte todos os valores de `req.body` para string (`String(value)`). Usado para normalizar dados antes da validação.

---

### `data/profile-img.js`

Configuração Multer para upload de imagens de perfil.

- **Storage:** `multer.memoryStorage()` — armazena como Buffer
- **Limite:** 2 MB
- **Formatos:** PNG, JPEG, JPG, WebP (sem GIF)

Exporta a instância `upload` do Multer. Uso típico:

```javascript
router.put("/avatar", upload.single("profile_image"), controller.updateAvatar);
```

---

## 4. Segurança

### `security/limiters.js`

Exporta dois rate limiters via `express-rate-limit`:

#### `requestLimiter` — limiter de uso geral

| Propriedade | Valor |
|-------------|-------|
| Janela | 10 minutos |
| Máximo | 15 requests |
| Chave | `req.ip` |
| Headers | `standardHeaders: true`, `legacyHeaders: false` |

Resposta ao exceder: `429` com `"Too many requests. Please wait at least 10 minutes to try again."`

#### `loginLimiter` — limiter de login (não utilizado atualmente)

| Propriedade | Valor |
|-------------|-------|
| Janela | 15 minutos |
| Máximo | 5 tentativas |
| Chave | `req.body.username` ou `req.ip` |
| `skipSuccessfulRequests` | `true` |

---

### `security/session.js`

#### `sessionMiddleware`

Sessão Express com store PostgreSQL via `connect-pg-simple`.

| Config | Valor |
|--------|-------|
| Store | `pgSession` (tabela `sessions`) |
| Cookie name | `auth.sid` |
| `httpOnly` | `true` |
| `secure` | `true` em produção |
| `sameSite` | `lax` |
| `maxAge` | 24 horas |
| `rolling` | `true` (renova a cada request) |
| `resave` | `false` |
| `saveUninitialized` | `false` |

**Variável de Ambiente:** `SESSION_SECRET`

---

### `security/ip-address.js`

#### `getClientIp(req, res, next)`

Extrai IP real do cliente e salva em `req.clientIp`. Ordem de verificação:

1. `x-forwarded-for` (primeiro da lista)
2. `x-real-ip`
3. `req.connection.remoteAddress`
4. `req.socket.remoteAddress`
5. `req.connection.socket?.remoteAddress`
6. Fallback: `127.0.0.1`

Normaliza prefixo IPv6 (`::ffff:`) para IPv4.

---

## 5. Tratamento de Erros

### `error-handler.js`

Exporta objeto `errorHandler` com dois handlers:

#### `notFoundHandler(req, res, next)`

Cria erro 404 com a URL tentada e passa via `next(err)`. Aplicado após todas as rotas no `app.js`.

#### `globalErrorHandler(err, req, res, next)`

Handler final de erros. Loga stack em desenvolvimento ou para erros 5xx.

Formato de resposta:

```json
{
  "error": {
    "message": "...",
    "status": 500,
    "timestamp": "2026-02-17T...",
    "path": "/api/v1/...",
    "method": "GET"
  }
}
```

Retorna `err.statusCode` se definido, caso contrário 500.

---

## 6. Utilitários de Imagem

### `data/image-utils.js`

Classe `ImageUtils` — singleton para operações de imagem no Digital Ocean Spaces.

Se as credenciais DO Spaces não estiverem configuradas, emite warning e `this.s3Client` fica `undefined` (métodos retornam `false` ou lançam erro).

#### Métodos de Upload

| Método | Key pattern | ACL | Retorno |
|--------|-------------|-----|---------|
| `saveProfileImage(buffer, mimeType, userId)` | `users-content/profile/user-{userId}-avatar.{ext}` | public-read | `{ success, url, filename, key, size }` |
| `saveOrganizationLogo(buffer, mimeType, orgId)` | `organizations/{orgId}/images/logo/org-{orgId}-logo.{ext}` | public-read | `{ success, url, filename, key, size }` |
| `saveOrganizationBanner(buffer, mimeType, orgId)` | `organizations/{orgId}/images/banner/org-{orgId}-banner.{ext}` | public-read | `{ success, url, filename, key, size }` |

Em caso de erro, retornam `{ success: false, error: "..." }` em vez de lançar exceção.

#### `deleteProfileImage(key)`

Deleta arquivo do Spaces por key. Retorna `true` ou `false`.

#### Métodos de Validação

| Método | Descrição |
|--------|-----------|
| `isValidImageType(mimeType)` | Aceita: jpeg, jpg, png, webp, gif |
| `isValidImageSize(size)` | Limite: 5 MB |
| `getExtensionFromMimeType(mimeType)` | Mapeia MIME → extensão (fallback: `.jpg`) |
| `extractKeyFromUrl(url)` | Extrai key S3 de uma URL completa; retorna a própria string se não for URL |

**Variáveis de Ambiente:** `DO_SPACES_ENDPOINT`, `DO_SPACES_ACCESS_KEY`, `DO_SPACES_SECRET_KEY`, `DO_SPACES_BUCKET_NAME`, `DO_SPACES_REGION`

---

### `utils/image-validator.js` (middleware)

#### `validateImages(req, res, next)`

Middleware que valida `req.file` usando `ImageUtils`:

1. Sem arquivo → `next()` (campo opcional)
2. Tipo inválido → `400` com "Only JPEG, PNG, WebP and GIF images are allowed."
3. Tamanho > 5 MB → `413` com tamanho informado na mensagem
4. Erro inesperado → `500` com "Unable to validate the uploaded image."

---

_Atualizado em: Fevereiro de 2026_
