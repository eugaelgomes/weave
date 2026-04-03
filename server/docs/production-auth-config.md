# Configuração de Autenticação em Produção

## Problema Comum: "Acesso negado. Token não fornecido"

Este erro ocorre quando o cookie de autenticação não está sendo enviado do frontend para o backend em produção.

## Checklist de Configuração

### 1. Variáveis de Ambiente (Backend)

#### Obrigatórias:

```env
NODE_ENV=production
SECRET_KEY=sua_chave_secreta_forte
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

#### Opcional (recomendado para subdomínios):

```env
COOKIE_DOMAIN=.seu-dominio.com
```

#### Opcional (para cross-domain):

```env
# Só use 'none' se frontend e backend estiverem em domínios completamente diferentes
# Padrão: 'lax' (funciona para mesmo domínio e subdomínios)
COOKIE_SAME_SITE=none
```

**Importante sobre COOKIE_DOMAIN:**

- Se frontend e backend estão no mesmo domínio: deixe vazio
- Se estão em subdomínios diferentes (ex: `app.example.com` e `api.example.com`): use `.example.com` (com ponto inicial)
- Se estão em domínios completamente diferentes: não use (cookies cross-domain têm limitações)

**Importante sobre COOKIE_SAME_SITE:**

- **lax** (padrão): Funciona para mesmo domínio e subdomínios. Mais seguro e compatível.
- **none**: Necessário apenas para domínios completamente diferentes (ex: app.com e api.outro.com). Requer HTTPS obrigatório.

### 2. HTTPS Obrigatório

Em produção (`NODE_ENV=production`), os cookies são configurados com `secure: true`, o que **exige HTTPS**.

**Certifique-se de que:**

- ✅ Frontend está rodando em HTTPS
- ✅ Backend está rodando em HTTPS
- ✅ Certificado SSL é válido (não autoassinado)
- ✅ Não há mixed content (HTTP e HTTPS juntos)

### 3. Configuração CORS

#### No Backend (já configurado):

- `credentials: true` ✅
- `allowedOrigins` configurado com as URLs do frontend ✅

#### No Frontend:

```typescript
fetch(url, {
  credentials: "include", // ✅ Já configurado em api-methods.ts
  // ... outras opções
});
```

### 4. Configuração do Proxy Reverso (Nginx/Apache)

Se estiver usando um proxy reverso, certifique-se de passar os headers corretos:

#### Nginx:

```nginx
location /api/ {
    proxy_pass http://backend:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_cookie_path / /;
    proxy_cookie_domain backend $host;
}
```

#### Apache:

```apache
ProxyPass /api/ http://backend:8080/
ProxyPassReverse /api/ http://backend:8080/
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
ProxyAddHeaders On
```

### 5. Trust Proxy (Backend)

No arquivo `global-middleware.js`, já está configurado:

```javascript
app.set("trust proxy", 1); // ✅
```

Isso permite que o Express confie no primeiro proxy (Nginx, Apache, etc.).

## Debug em Produção

### Logs Adicionados

O código agora inclui logs detalhados quando há falha de autenticação:

```javascript
// Middleware de autenticação (middlewares/authentication/index.js)
[Auth Error] Token não encontrado {
  hasCookies: true/false,
  cookieKeys: [...],
  hasAuthHeader: true/false,
  origin: "https://...",
  referer: "https://...",
  path: "/api/v1/..."
}
```

```javascript
// Helper de cookies (utils/cookie-helper.js)
[Cookie Config] {
  hostname: "api.example.com",
  domain: ".example.com",
  secure: true,
  sameSite: "lax",
  origin: "https://app.example.com"
}
```

### Verificando Logs

```bash
# Docker
docker compose logs -f server | grep -E "\[Auth|Cookie\]"

# PM2
pm2 logs server --lines 100 | grep -E "\[Auth|Cookie\]"
```

## Testes Rápidos

### 1. Verificar se o cookie está sendo criado

Após fazer login, verifique nos DevTools do navegador:

1. Abra DevTools (F12)
2. Vá em Application/Storage → Cookies
3. Procure pelo cookie `token`
4. Verifique os atributos:
   - `HttpOnly`: ✅
   - `Secure`: ✅ Lax (ou None se configurado)HTTPS)
   - `SameSite`: None
   - `Domain`: deve corresponder ao seu domínio

### 2. Verificar se o cookie está sendo enviado

Nas requisições subsequentes:

1. DevTools → Network
2. Faça uma requisição à API
3. Verifique a requisição → Headers → Request Headers
4. Procure por `Cookie: token=...`

Se o cookie **não aparecer**, problemas comuns:

- Domínio do cookie incorreto
- Cookie expirado
- SameSite/Secure incompatível com a configuração
- Navegador bloqueando cookies de terceiros

### 3. Teste cURL

```bash
# Login
curl -v -X POST https://api.example.com/api/v1/auth \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{"login":"user","password":"pass"}' \
  -c cookies.txt

# Requisição autenticada
curl -v https://api.example.com/api/v1/users/me \
  -H "Origin: https://example.com" \
  -b cookies.txt
```

## Soluções para Problemas Comuns

### Problema: Cookie não é criado

**Causa**: HTTPS não configurado ou certificado inválido  
**Solução**: Configure HTTPS com certificado válido (Let's Encrypt)

### Problema: Cookie criado mas não enviado

**Causa**: Domínio do cookie incompatível  
**Solução**: Configure `COOKIE_DOMAIN` corretamente ou deixe vazio

### Problema: CORS blocked

**Causa**: `ALLOWED_ORIGINS` não inclui o frontend  
**Solução**: Adicione a URL completa do frontend em `ALLOWED_ORIGINS`

### Problema: "Origin header obrigatório em produção"

**Causa**: Requisição não tem header Origin  
**Solução**: Certifique-se de que o frontend está enviando o header Origin (fetch com credentials: 'include' já faz isso)

### Problema: Funciona localmente mas não em produção

**Causa**: Diferenças de configuração de ambiente  
**Solução**: Verifique todas as variáveis de ambiente acima

## Arquivos Modificados

✅ **server/src/utils/cookie-helper.js** (NOVO)

- Função centralizada para configuração de cookies
- Logs de debug em produção

✅ **server/src/middlewares/authentication/index.js**

- Logs detalhados de debug
- Identificação da origem do token (cookie ou header)

✅ **server/src/modules/auth/auth.controller.js**

- Uso do cookie-helper centralizado
- Consistência na configuração de cookies

## Próximos Passos

1. Configure as variáveis de ambiente conforme o checklist
2. Execute a aplicação em produção
3. Verifique os logs de `[Cookie Config]` e `[Auth Error]`
4. Se o problema persistir, verifique o checklist novamente
5. Use os testes cURL para isolar o problema

## Suporte

Se após seguir todos os passos o problema persistir, colete as seguintes informações:

1. Logs do backend (filtrados por `[Auth|Cookie]`)
2. Screenshot dos cookies no DevTools
3. Screenshot dos headers da requisição falhada
4. Configuração do NGINX/Apache (se aplicável)
5. Valores das variáveis de ambiente (sem expor SECRET_KEY)
