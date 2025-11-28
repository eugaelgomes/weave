# Documentação de Middlewares

Esta documentação descreve todos os middlewares utilizados no servidor, organizados por categoria e função.

---

## 📑 Índice

1. [Middlewares Globais](#middlewares-globais)
2. [Middlewares de Autenticação](#middlewares-de-autenticação)
3. [Middlewares de Validação de Dados](#middlewares-de-validação-de-dados)
4. [Middlewares de Segurança](#middlewares-de-segurança)
5. [Middlewares de Tratamento de Erros](#middlewares-de-tratamento-de-erros)
6. [Utilitários de Imagem](#utilitários-de-imagem)

---

## 1. Middlewares Globais

### 📄 Arquivo: `global-middleware.js`

Configura e aplica middlewares globais essenciais para toda a aplicação. A ordem de aplicação é crítica para segurança e funcionalidade.

#### Funções Principais

##### `parseAllowedOrigins(env)`

Parseia e valida origens permitidas da variável de ambiente.

**Parâmetros:**

- `env` (string): Lista separada por vírgulas de origens permitidas

**Retorno:**

- `string[]`: Array de URLs de origem normalizadas

**Comportamento:**

- **Produção**: Lança erro se `ALLOWED_ORIGINS` não estiver configurado
- **Desenvolvimento**: Retorna fallback para `localhost:3000` e `localhost:5173`
- Remove barras finais das URLs
- Filtra valores vazios

**Exemplo:**

```javascript
// .env
ALLOWED_ORIGINS=https://app.example.com,https://*.api.example.com

// Resultado
['https://app.example.com', 'https://*.api.example.com']
```

---

##### `buildMatcher(allowed)`

Cria uma função de validação de origem que suporta padrões wildcard.

**Parâmetros:**

- `allowed` (string): Padrão de origem permitida (pode conter `*`)

**Retorno:**

- `Function`: Função matcher que testa strings de origem

**Exemplos:**

```javascript
// Exata
const matcher1 = buildMatcher('https://app.example.com');
matcher1('https://app.example.com'); // true
matcher1('https://other.com'); // false

// Wildcard
const matcher2 = buildMatcher('https://*.example.com');
matcher2('https://api.example.com'); // true
matcher2('https://app.example.com'); // true
matcher2('https://example.com'); // false
```

---

##### `makeCorsOptions(allowedOrigins)`

Configura opções CORS com validação dinâmica de origem.

**Parâmetros:**

- `allowedOrigins` (string[]): Array de origens permitidas

**Retorno:**

- `Object`: Configuração CORS completa

**Configurações:**

| Propriedade              | Valor                                                             | Descrição                      |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------- |
| `credentials`          | `true`                                                          | Permite cookies HttpOnly         |
| `methods`              | `GET, POST, PUT, DELETE, PATCH, OPTIONS`                        | Métodos HTTP permitidos         |
| `allowedHeaders`       | `Content-Type, Authorization, X-Requested-With, Accept, Cookie` | Headers aceitos                  |
| `exposedHeaders`       | `Content-Range, X-Content-Range, Set-Cookie`                    | Headers expostos ao cliente      |
| `maxAge`               | `600` (10 minutos)                                              | Cache de requisições preflight |
| `optionsSuccessStatus` | `204`                                                           | Status para OPTIONS bem-sucedido |

**Comportamento por Ambiente:**

- **Desenvolvimento**:

  - Permite `localhost` em qualquer porta
  - Permite `127.0.0.1` em qualquer porta
  - Aceita requisições sem header `Origin` (útil para Postman, curl)
- **Produção**:

  - Exige header `Origin` obrigatório
  - Valida contra whitelist estrita
  - Retorna erro se origem não permitida

**Exemplo:**

```javascript
// Request válido
Origin: https://app.example.com
// → permitido se estiver em ALLOWED_ORIGINS

// Request inválido em produção
// (sem Origin header)
// → erro "Origin header obrigatório em produção"
```

---

##### `configureGlobalMiddlewares(app)`

Aplica todos os middlewares globais na ordem correta.

**Ordem de Aplicação:**

1. **Cookie Parser**: Parseia cookies de requisições
2. **Session**: Gerenciamento de sessão com PostgreSQL
3. **Body Parser**:
   - `urlencoded({ extended: true })`: Dados de formulário
   - `json()`: Payloads JSON
4. **Trust Proxy**: Confia no primeiro proxy (para detecção de IP)
5. **Client IP**: Extrai e anexa IP do cliente
6. **CORS**: Validação de origem e configuração
7. **Helmet**: Headers de segurança HTTP

**Helmet - Configuração de Segurança:**

```javascript
{
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,        // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", process.env.TRUSTED_CDN || "'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []  // HTTP → HTTPS automático
    }
  },
  
  frameguard: { action: "deny" },           // Previne clickjacking
  noSniff: true,                            // Previne MIME sniffing
  referrerPolicy: {                         // Controla informação de referrer
    policy: "strict-origin-when-cross-origin"
  }
}
```

**Variáveis de Ambiente Utilizadas:**

- `ALLOWED_ORIGINS`: Origens CORS permitidas
- `NODE_ENV`: Ambiente de execução (development/production)
- `TRUSTED_CDN`: CDN confiável para scripts (CSP)

---

## 2. Middlewares de Autenticação

### 📄 Arquivo: `auth/auth-middleware.js`

Middleware de autenticação JWT que valida tokens de acesso.

#### `verifyToken(req, res, next)`

Verifica e decodifica tokens JWT de cookies HttpOnly ou header Authorization.

**Ordem de Verificação:**

1. Cookie `token` (HttpOnly - preferencial)
2. Header `Authorization: Bearer <token>`

**Processo:**

```javascript
// 1. Extrair token
const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

// 2. Verificar presença
if (!token) {
  return res.status(401).json({ 
    message: "Acesso negado. Token não fornecido." 
  });
}

// 3. Validar JWT
const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });

// 4. Anexar usuário ao request
req.user = decoded;  // { userId, email, etc. }
```

**Respostas:**

| Status | Condição               | Mensagem                               |
| ------ | ------------------------ | -------------------------------------- |
| 401    | Token ausente            | "Acesso negado. Token não fornecido." |
| 401    | Token inválido/expirado | "Token inválido ou expirado."         |
| 200    | Token válido            | Continua para próximo middleware      |

**Payload Decodificado:**

```javascript
{
  userId: 123,
  email: "user@example.com",
  iat: 1234567890,  // Issued At
  exp: 1234571490   // Expiration
}
```

**Uso em Rotas:**

```javascript
router.get('/protected', verifyToken, (req, res) => {
  const userId = req.user.userId;
  // ... lógica protegida
});
```

**Variáveis de Ambiente:**

- `SECRET_KEY`: Chave secreta para assinatura JWT

---

## 3. Middlewares de Validação de Dados

### 📄 Arquivo: `data/data-validator.js`

Validador de dados de usuário usando `express-validator`.

#### `dataValidator()`

Retorna array de validadores para criação/atualização de conta.

**Campos Validados:**

##### 1. **Name** (Nome)

```javascript
body('name')
  .trim()
  .matches(/^[\p{L}\s]+$/u)  // Unicode letters + espaços
  .withMessage('Apenas letras e espaços são permitidos.')
  .isLength({ min: 1, max: 100 })
  .withMessage('Name cannot be empty or too long.')
  .escape()
```

- **Permitido**: Letras de qualquer idioma (unicode) e espaços
- **Tamanho**: 1 a 100 caracteres
- **Sanitização**: Trim e escape HTML

##### 2. **Username** (Nome de usuário)

```javascript
body('username')
  .trim()
  .matches(/^[a-zA-Z0-9._-]+$/)  // Alfanumérico + . _ -
  .withMessage('Invalid characters...')
  .isLength({ min: 6, max: 18 })
  .withMessage('Username must be between 6 and 18 characters.')
  .escape()
```

- **Permitido**: Letras, números, `.`, `_`, `-`
- **Tamanho**: 6 a 18 caracteres
- **Exemplos válidos**: `john_doe`, `user.123`, `my-user`

##### 3. **Email**

```javascript
body('email')
  .isEmail()
  .withMessage('Email is invalid.')
```

- Validação padrão de email
- Aceita formatos RFC 5322

##### 4. **Password** (Senha)

```javascript
body('password')
  .isStrongPassword({
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    // minSymbols: 1  // Comentado
  })
  .withMessage('Password must contain at least 8 characters...')
```

- **Requisitos**:
  - Mínimo 6 caracteres
  - Ao menos 1 letra minúscula
  - Ao menos 1 letra maiúscula
  - Ao menos 1 número
- **Nota**: Símbolos especiais estão comentados (opcional)

**Uso em Rotas:**

```javascript
router.post('/create-account', 
  dataValidator(),
  validationResult,  // Middleware para checar erros
  controller.createAccount
);
```

**Exemplo de Resposta de Erro:**

```json
{
  "errors": [
    {
      "msg": "Username must be between 6 and 18 characters.",
      "param": "username",
      "location": "body"
    }
  ]
}
```

---

### 📄 Arquivo: `data/image-validator.js`

Valida imagens enviadas via upload.

#### `validateImageMVP(req, res, next)`

Validação básica de tipo e tamanho de imagem.

**Processo:**

```javascript
// 1. Verificar presença de arquivo
if (!req.file || !req.file.buffer) {
  return next();  // Sem arquivo = OK (campo opcional)
}

// 2. Validar tipo MIME
if (!isValidImageType(req.file.mimetype)) {
  return 400 - "Invalid file type"
}

// 3. Validar tamanho
if (!isValidImageSize(req.file.size)) {
  return 413 - "File too large"
}
```

**Tipos MIME Permitidos:**

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

**Limite de Tamanho:**

- Máximo: **5 MB** (5,242,880 bytes)

**Respostas:**

| Status | Erro             | Mensagem                                           |
| ------ | ---------------- | -------------------------------------------------- |
| 400    | Tipo inválido   | "Only JPEG, PNG, WebP and GIF images are allowed." |
| 413    | Arquivo grande   | "Image size (XMB) exceeds limit (5MB)."            |
| 500    | Erro validação | "Unable to validate the uploaded image."           |

**Uso com Multer:**

```javascript
router.post('/upload', 
  upload.single('profile_image'),
  validateImageMVP,
  controller.uploadImage
);
```

---

### 📄 Arquivo: `data/profile-img.js`

Configuração Multer para upload de imagens de perfil.

#### Configuração de Storage

```javascript
const storage = multer.memoryStorage();
```

- Armazena arquivo em **memória** (buffer)
- Permite processamento antes de salvar no banco/storage

#### Limites e Filtros

```javascript
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 2 * 1024 * 1024  // 2 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp'
    ];
  
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, JPG, and WEBP formats are allowed!'), false);
    }
  
    cb(null, true);
  }
});
```

**Limites:**

- Tamanho máximo: **2 MB**
- Formatos: PNG, JPEG, JPG, WebP (GIF não permitido aqui)

**Uso:**

```javascript
// Upload único
router.post('/profile', upload.single('profile_image'), ...);

// Upload múltiplo
router.post('/gallery', upload.array('images', 5), ...);
```

**Estrutura `req.file`:**

```javascript
{
  fieldname: 'profile_image',
  originalname: 'photo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: <Buffer ...>,
  size: 1048576  // bytes
}
```

---

### 📄 Arquivo: `data/stringfy.js`

Converte todos os campos do body para string.

#### `toString(req, res, next)`

Transforma valores não-string em string.

**Processo:**

```javascript
for (let key in req.body) {
  if (typeof req.body[key] !== 'string') {
    req.body[key] = String(req.body[key]);
  }
}
```

**Casos de Uso:**

- Normalizar dados de formulários
- Garantir tipo consistente para validação
- Prevenir erros de tipo em operações de string

**Exemplo:**

```javascript
// Antes
req.body = {
  name: "John",
  age: 25,
  active: true,
  score: 98.5
}

// Depois
req.body = {
  name: "John",
  age: "25",
  active: "true",
  score: "98.5"
}
```

**Uso:**

```javascript
router.post('/form', toString, controller.processForm);
```

---

## 4. Middlewares de Segurança

### 📄 Arquivo: `security/limiters.js`

Rate limiting para proteção contra ataques de força bruta.

#### `loginLimiter`

Limita tentativas de login por IP e username.

**Configuração:**

```javascript
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,        // Janela de 10 minutos
  max: 15,                          // Máximo 15 tentativas
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,            // Headers RateLimit-*
  legacyHeaders: false,             // Remove X-RateLimit-*
  
  keyGenerator: (req) => 
    req.body.username || req.ip,    // Bloqueia por username OU IP
  
  handler: (req, res) => {
    res.status(429).json({ 
      message: 'Too many attempts. Please wait 15 minutes.' 
    });
  },
  
  skipSuccessfulRequests: true      // Reset após login bem-sucedido
});
```

**Características:**

| Propriedade | Valor                  | Descrição                   |
| ----------- | ---------------------- | ----------------------------- |
| Janela      | 10 minutos             | Período de contagem          |
| Máximo     | 15 tentativas          | Limite de requisições       |
| Chave       | `username` ou `ip` | Identificador único          |
| Reset       | Em sucesso             | Limpa contador após login OK |

**Headers de Resposta:**

```http
RateLimit-Limit: 15
RateLimit-Remaining: 10
RateLimit-Reset: 1234567890
```

**Resposta ao Exceder Limite:**

```json
{
  "message": "Too many attempts. Please wait 15 minutes."
}
```

Status: `429 Too Many Requests`

**Uso:**

```javascript
router.post('/signin', loginLimiter, authController.signin);
```

**Proteção:**

- **Por Username**: Impede ataques direcionados a um usuário
- **Por IP**: Impede ataques distribuídos de um único IP
- **Reset**: Não penaliza usuários legítimos após login correto

---

### 📄 Arquivo: `security/session.js`

Configuração de sessão com armazenamento PostgreSQL.

#### `sessionMiddleware`

Middleware de sessão com persistência em banco de dados.

**Configuração:**

```javascript
const sessionConfig = {
  store: new pgSession({
    pool: pool,              // Pool de conexão PostgreSQL
    tableName: 'sessions'    // Tabela de sessões
  }),
  
  name: 'auth.sid',          // Nome do cookie
  secret: process.env.SESSION_SECRET,
  resave: false,             // Não salva se não modificada
  saveUninitialized: false,  // Não salva sessões vazias
  rolling: true,             // Renova expiração a cada request
  
  cookie: {
    httpOnly: true,          // Previne acesso via JavaScript
    secure: process.env.NODE_ENV === 'production',  // HTTPS apenas em produção
    sameSite: 'lax',         // Proteção CSRF moderada
    maxAge: 1000 * 60 * 60 * 24  // 24 horas
  }
};
```

**Store PostgreSQL:**

- **Tabela**: `sessions`
- **Schema Automático**: Criado pelo `connect-pg-simple`
- **Limpeza**: Sessões expiradas removidas automaticamente

**Estrutura da Tabela `sessions`:**

```sql
CREATE TABLE sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX "IDX_session_expire" ON sessions ("expire");
```

**Cookie de Sessão:**

| Propriedade  | Valor           | Descrição                  |
| ------------ | --------------- | ---------------------------- |
| `name`     | `auth.sid`    | Nome do cookie               |
| `httpOnly` | `true`        | Não acessível via JS (XSS) |
| `secure`   | `true` (prod) | Apenas HTTPS em produção   |
| `sameSite` | `lax`         | Permite GET cross-origin     |
| `maxAge`   | 24 horas        | Duração da sessão         |
| `rolling`  | `true`        | Renova a cada requisição   |

**Comportamento Rolling:**

```javascript
// Usuário ativo = sessão sempre válida
Request 1 → expires at 10:00 AM + 24h = 10:00 AM (next day)
Request 2 (at 2:00 PM) → expires at 2:00 PM + 24h = 2:00 PM (next day)
```

**Uso em Controllers:**

```javascript
// Criar sessão
req.session.userId = user.id;

// Ler sessão
const userId = req.session.userId;

// Destruir sessão
req.session.destroy((err) => {
  if (err) console.error(err);
});
```

**Variáveis de Ambiente:**

- `SESSION_SECRET`: Chave secreta para assinar cookies de sessão

---

### 📄 Arquivo: `security/ip-address.js`

Extração confiável do IP do cliente.

#### `getClientIp(req, res, next)`

Detecta IP real do cliente mesmo atrás de proxies/load balancers.

**Ordem de Verificação:**

```javascript
req.clientIp = 
  req.headers['x-forwarded-for']?.split(',')[0] ||  // 1. Proxy/LB
  req.headers['x-real-ip'] ||                       // 2. Nginx
  req.connection.remoteAddress ||                   // 3. Conexão direta
  req.socket.remoteAddress ||                       // 4. Socket
  req.connection.socket?.remoteAddress ||           // 5. Socket aninhado
  '127.0.0.1';                                      // 6. Fallback
```

**Normalização IPv6:**

```javascript
// Remove prefixo IPv6
if (req.clientIp.startsWith('::ffff:')) {
  req.clientIp = req.clientIp.substr(7);
}

// Exemplo:
// "::ffff:192.168.1.100" → "192.168.1.100"
```

**Headers de Proxy:**

| Header              | Fonte         | Exemplo                       |
| ------------------- | ------------- | ----------------------------- |
| `X-Forwarded-For` | Load Balancer | `203.0.113.1, 198.51.100.1` |
| `X-Real-IP`       | Nginx         | `203.0.113.1`               |

**Casos de Uso:**

```javascript
// Logging
console.log(`Request from ${req.clientIp}`);

// Rate limiting
const key = req.clientIp;

// Geolocalização
const location = geoip.lookup(req.clientIp);

// Bloqueio
if (blacklist.includes(req.clientIp)) {
  return res.status(403).send('Forbidden');
}
```

**Notas:**

- **Trust Proxy**: Requer `app.set('trust proxy', 1)` para funcionar corretamente
- **Múltiplos Proxies**: `X-Forwarded-For` contém lista (pega o primeiro)
- **IPv6**: Normaliza para IPv4 quando possível

---

## 5. Middlewares de Tratamento de Erros

### 📄 Arquivo: `error-handler.js`

Handlers centralizados de erros.

#### `notFoundHandler(req, res, next)`

Captura rotas não encontradas (404).

**Implementação:**

```javascript
notFoundHandler: (req, res, next) => {
  const err = new Error(`Route "${req.originalUrl}" not found`);
  err.statusCode = 404;
  next(err);
}
```

**Uso:**

```javascript
// Aplicar APÓS todas as rotas
app.use(router);
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.globalErrorHandler);
```

**Fluxo:**

1. Request chega em rota inexistente
2. `notFoundHandler` cria erro com status 404
3. Passa erro para `globalErrorHandler` via `next(err)`

---

#### `globalErrorHandler(err, req, res, next)`

Handler global de erros com logging condicional.

**Implementação:**

```javascript
globalErrorHandler: (err, req, res, next) => {
  // Logging condicional
  if (process.env.NODE_ENV === 'development' || err.statusCode >= 500) {
    console.error(err.stack || err);
  }
  
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
}
```

**Logging:**

- **Development**: Loga todos os erros
- **Production**: Loga apenas erros 5xx
- **404**: Não loga em produção (ruído)

**Formato de Resposta:**

```json
{
  "error": {
    "message": "Route \"/api/invalid\" not found",
    "status": 404,
    "timestamp": "2025-11-03T10:30:00.000Z",
    "path": "/api/invalid",
    "method": "GET"
  }
}
```

**Uso em Controllers:**

```javascript
try {
  const user = await findUser(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  res.json(user);
} catch (error) {
  next(error);  // Passa para globalErrorHandler
}
```

**Códigos de Status Comuns:**

| Status | Tipo                  | Exemplo                       |
| ------ | --------------------- | ----------------------------- |
| 400    | Bad Request           | Dados inválidos              |
| 401    | Unauthorized          | Token inválido               |
| 403    | Forbidden             | Permissão negada             |
| 404    | Not Found             | Recurso não existe           |
| 409    | Conflict              | Duplicação (email/username) |
| 413    | Payload Too Large     | Arquivo muito grande          |
| 429    | Too Many Requests     | Rate limit excedido           |
| 500    | Internal Server Error | Erro inesperado               |

---

## 6. Utilitários de Imagem

### 📄 Arquivo: `data/image-utils.js`

Classe utilitária para gerenciamento de imagens no Digital Ocean Spaces.

#### Classe `ImageUtils`

**Singleton** para operações de upload, exclusão e validação de imagens.

##### Constructor

```javascript
constructor() {
  this.spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
  this.accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
  this.secretAccessKey = process.env.DO_SPACES_SECRET_KEY;
  this.bucketName = process.env.DO_SPACES_BUCKET_NAME;
  this.region = process.env.DO_SPACES_REGION || 'nyc3';
  
  // Inicializa S3 Client
  this.s3Client = new S3Client({
    endpoint: this.spacesEndpoint,
    region: this.region,
    credentials: {
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey
    },
    forcePathStyle: false
  });
}
```

**Variáveis de Ambiente Necessárias:**

- `DO_SPACES_ENDPOINT`: URL do endpoint (ex: `https://nyc3.digitaloceanspaces.com`)
- `DO_SPACES_ACCESS_KEY`: Chave de acesso
- `DO_SPACES_SECRET_KEY`: Chave secreta
- `DO_SPACES_BUCKET_NAME`: Nome do bucket
- `DO_SPACES_REGION`: Região (padrão: `nyc3`)

---

##### `saveProfileImage(imageBuffer, mimeType, userId)`

Upload de imagem de perfil para Digital Ocean Spaces.

**Parâmetros:**

- `imageBuffer` (Buffer): Buffer da imagem
- `mimeType` (string): Tipo MIME (ex: `image/jpeg`)
- `userId` (string|number): ID do usuário

**Retorno:**

```javascript
// Sucesso
{
  success: true,
  url: 'https://nyc3.digitaloceanspaces.com/bucket/profile-images/user-123-avatar.jpg',
  filename: 'user-123-avatar.jpg',
  key: 'profile-images/user-123-avatar.jpg',
  size: 1048576
}

// Erro
{
  success: false,
  error: 'Error message'
}
```

**Processo:**

1. Gera nome de arquivo: `user-${userId}-avatar.${ext}`
2. Define key: `profile-images/user-123-avatar.jpg`
3. Faz upload com ACL `public-read`
4. Retorna URL pública

**Exemplo de Uso:**

```javascript
const result = await imageUtils.saveProfileImage(
  req.file.buffer,
  req.file.mimetype,
  req.user.userId
);

if (result.success) {
  await db.query(
    'UPDATE users SET profile_image_url = $1 WHERE id = $2',
    [result.url, req.user.userId]
  );
}
```

**Configurações de Upload:**

```javascript
{
  Bucket: 'your-bucket-name',
  Key: 'profile-images/user-123-avatar.jpg',
  Body: imageBuffer,
  ContentType: 'image/jpeg',
  ACL: 'public-read'  // Imagem publicamente acessível
}
```

---

##### `deleteProfileImage(key)`

Remove imagem do Digital Ocean Spaces.

**Parâmetros:**

- `key` (string): Chave da imagem (ex: `profile-images/user-123-avatar.jpg`)

**Retorno:**

- `true`: Exclusão bem-sucedida
- `false`: Erro ou Spaces não configurado

**Exemplo:**

```javascript
const deleted = await imageUtils.deleteProfileImage(
  'profile-images/user-123-avatar.jpg'
);

if (deleted) {
  console.log('Image removed successfully');
}
```

**Caso de Uso:**

```javascript
// Remover imagem antiga ao atualizar
if (user.profile_image_key) {
  await imageUtils.deleteProfileImage(user.profile_image_key);
}

// Upload nova imagem
const result = await imageUtils.saveProfileImage(...);
```

---

##### `getExtensionFromMimeType(mimeType)`

Converte tipo MIME em extensão de arquivo.

**Mapeamento:**

```javascript
{
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
}
```

**Fallback:** `.jpg` para tipos desconhecidos

**Exemplo:**

```javascript
getExtensionFromMimeType('image/png');  // '.png'
getExtensionFromMimeType('image/webp'); // '.webp'
getExtensionFromMimeType('unknown');    // '.jpg'
```

---

##### `isValidImageType(mimeType)`

Valida se o tipo MIME é uma imagem suportada.

**Tipos Suportados:**

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

**Retorno:** `boolean`

**Exemplo:**

```javascript
isValidImageType('image/png');    // true
isValidImageType('image/svg+xml'); // false
isValidImageType('video/mp4');    // false
```

---

##### `isValidImageSize(size)`

Valida se o tamanho da imagem está dentro do limite.

**Limite:** 5 MB (5,242,880 bytes)

**Parâmetros:**

- `size` (number): Tamanho em bytes

**Retorno:** `boolean`

**Exemplo:**

```javascript
isValidImageSize(1024 * 1024);       // 1 MB → true
isValidImageSize(10 * 1024 * 1024);  // 10 MB → false
```

**Uso no Middleware:**

```javascript
if (!imageUtils.isValidImageSize(req.file.size)) {
  return res.status(413).json({
    error: 'File too large',
    message: `Image size (${Math.round(req.file.size / 1024 / 1024)}MB) exceeds limit (5MB).`
  });
}
```

---

## 📊 Fluxo de Middlewares em Requisições

### Requisição Típica (Rota Protegida)

```
1. Cookie Parser
   ↓
2. Session Middleware
   ↓
3. Body Parser (urlencoded/json)
   ↓
4. Trust Proxy
   ↓
5. Get Client IP
   ↓
6. CORS Validation
   ↓
7. Helmet (Security Headers)
   ↓
8. Rate Limiter (se aplicável)
   ↓
9. Verify Token (auth)
   ↓
10. Data Validator (se aplicável)
   ↓
11. Image Validator (se upload)
   ↓
12. Controller
   ↓
13. Error Handler (se erro)
```

### Exemplo Prático: Upload de Imagem de Perfil

```javascript
router.put('/me/update-profile',
  verifyToken,              // 1. Autentica usuário
  upload.single('image'),   // 2. Processa upload (Multer)
  validateImageMVP,         // 3. Valida tipo/tamanho
  authController.updateProfile  // 4. Controller
);
```

**Fluxo Detalhado:**

1. **CORS**: Valida origem
2. **verifyToken**: Decodifica JWT → `req.user = { userId, email }`
3. **upload.single**: Parseia multipart → `req.file = { buffer, mimetype, size }`
4. **validateImageMVP**: Valida MIME e tamanho
5. **Controller**:
   - `imageUtils.saveProfileImage()` → Upload para Spaces
   - Atualiza banco com URL
   - Retorna resposta

---

## 🔐 Segurança em Camadas

### Proteções Implementadas

| Camada              | Middleware        | Proteção             |
| ------------------- | ----------------- | ---------------------- |
| **Transport** | Helmet HSTS       | Force HTTPS            |
| **Origin**    | CORS              | Whitelist de origens   |
| **Headers**   | Helmet CSP        | Previne XSS            |
| **Cookies**   | httpOnly + secure | Previne roubo de token |
| **Session**   | sameSite: lax     | Proteção CSRF        |
| **Rate**      | loginLimiter      | Brute force            |
| **Auth**      | verifyToken       | Acesso não autorizado |
| **Input**     | dataValidator     | Injeção SQL/XSS      |
| **Upload**    | imageValidator    | Arquivos maliciosos    |

---

## 1. Ordem de Middlewares

- **Sempre** aplicar middlewares globais antes de rotas
- **CORS e Helmet** antes de qualquer lógica de negócio
- **Autenticação** antes de validação de dados
- **Error handlers** sempre por último

### 2. Validação em Múltiplas Camadas

```javascript
// ✅ Correto: Validação em camadas
router.post('/create',
  verifyToken,         // 1. Autenticação
  dataValidator(),     // 2. Validação de dados
  imageValidator,      // 3. Validação de arquivo
  controller.create    // 4. Lógica de negócio (+ validação DB)
);

// ❌ Errado: Validação apenas no controller
router.post('/create', controller.create);
```

### 3. Tratamento de Erros

```javascript
// ✅ Sempre usar next(err) para erros
try {
  await someOperation();
} catch (error) {
  next(error);  // Passa para globalErrorHandler
}

// ❌ Evitar responses diretas em middlewares
catch (error) {
  res.status(500).send('Error');  // Pula error handler
}
```

### 4. Segurança de Sessões

```javascript
// ✅ Destruir sessão em logout
req.session.destroy();

// ✅ Regenerar session ID após login
req.session.regenerate((err) => {
  req.session.userId = user.id;
});

// ❌ Nunca armazenar senhas em sessão
req.session.password = password;  // NUNCA faça isso
```

### 5. Rate Limiting Granular

```javascript
// ✅ Limiters específicos por rota
const strictLimiter = rateLimit({ max: 5, windowMs: 15*60*1000 });
const normalLimiter = rateLimit({ max: 100, windowMs: 15*60*1000 });

router.post('/login', strictLimiter, ...);
router.get('/notes', normalLimiter, ...);

// ❌ Um único limiter global
app.use(rateLimit({ max: 100 }));  // Muito genérico
```

---

## 🧪 Testando Middlewares

### CORS

```bash
# Teste de origem permitida
curl -H "Origin: https://app.example.com" http://localhost:8080/api

# Teste de origem bloqueada
curl -H "Origin: https://malicious.com" http://localhost:8080/api
```

### Autenticação

```bash
# Sem token
curl http://localhost:8080/api/notes

# Com token inválido
curl -H "Authorization: Bearer invalid_token" http://localhost:8080/api/notes

# Com token válido
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:8080/api/notes
```

### Rate Limiting

```bash
# Script para testar limite de login
for i in {1..20}; do
  curl -X POST http://localhost:8080/api/signin \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo "Attempt $i"
done
```

### Upload de Imagem

```bash
# Válido
curl -X POST http://localhost:8080/api/users/create-account \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "username=johndoe" \
  -F "password=SecurePass123" \
  -F "profile_image=@photo.jpg"

# Inválido (arquivo grande)
curl -X POST http://localhost:8080/api/users/create-account \
  -F "profile_image=@large_file.jpg"  # > 5MB
```
