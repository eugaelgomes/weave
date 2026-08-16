# Configuração do Frontend para Produção

## ✅ O que já está configurado

O frontend **não precisa de alterações no código**. As seguintes configurações já estão corretas:

1. **Credentials** - `credentials: 'include'` em todas as requisições
2. **Headers Origin** - Enviado automaticamente pelo navegador
3. **CORS** - Next.js não bloqueia requisições ao backend

## 📋 Checklist de Produção

### 1. Variáveis de Ambiente

Crie um arquivo `.env.production` ou configure no seu provedor de hospedagem:

```env
# OBRIGATÓRIO: URL da API (Backend)
NEXT_PUBLIC_API_BASE_URL=https://api.seu-dominio.com/api/v1

# OPCIONAL: URL do aplicativo
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# OPCIONAL: CDN
NEXT_PUBLIC_CDN_BASE_URL=https://seu-cdn.com
```

⚠️ **IMPORTANTE**:

- A URL deve ser completa com `https://`
- Não coloque barra `/` no final
- `NEXT_PUBLIC_` é necessário para variáveis acessíveis no browser

### 2. Configuração do Backend

O backend precisa ter sua URL na lista de origens permitidas:

```env
# Backend .env
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

### 3. HTTPS Obrigatório

Em produção, **você DEVE usar HTTPS** em:

- ✅ Frontend
- ✅ Backend
- ✅ Certificado SSL válido

Sem HTTPS, os cookies com `secure: true` não funcionam!

### 4. Build e Deploy

```bash
# Build de produção
cd web
npm run build

# Testar localmente
npm run start

# Ou com Docker
docker compose -f docker-compose.yml up --build
```

## 🔍 Cenários de Deploy

### Cenário 1: Mesmo Domínio

**Frontend**: `https://exemplo.com`  
**Backend**: `https://exemplo.com/api`

```env
# Frontend
NEXT_PUBLIC_API_BASE_URL=https://exemplo.com/api/v1

# Backend
ALLOWED_ORIGINS=https://exemplo.com
COOKIE_DOMAIN= # deixe vazio ou remova
```

### Cenário 2: Subdomínios

**Frontend**: `https://app.exemplo.com`  
**Backend**: `https://api.exemplo.com`

```env
# Frontend
NEXT_PUBLIC_API_BASE_URL=https://api.exemplo.com/api/v1

# Backend
ALLOWED_ORIGINS=https://app.exemplo.com
COOKIE_DOMAIN=.exemplo.com # note o ponto inicial!
```

### Cenário 3: Domínios Diferentes (❌ Limitado)

**Frontend**: `https://frontend.com`  
**Backend**: `https://backend.com`

⚠️ **Limitação**: Cookies cross-domain têm restrições severas nos navegadores modernos.

**Alternativa**: Use token no header Authorization:

```typescript
// Modificação necessária (apenas para domínios completamente diferentes)
const config: RequestInit = {
  ...options,
  headers: {
    ...this.defaultHeaders,
    Authorization: `Bearer ${getTokenFromLocalStorage()}`,
    ...options.headers,
  },
};
```

## 🐛 Debug no Frontend

### DevTools - Checar Cookies

1. F12 → Application/Storage → Cookies
2. Procure por `token`
3. Verifique:
   - **HttpOnly**: ✅ (não aparece em JavaScript)
   - **Secure**: ✅ (apenas em HTTPS)
   - **SameSite**: None
   - **Domain**: deve incluir seu domínio

### DevTools - Checar Requisições

1. F12 → Network
2. Faça login
3. Clique em qualquer requisição à API
4. Verifique:
   - **Request Headers**: deve ter `Cookie: token=...`
   - **Response Headers** (no login): deve ter `Set-Cookie: token=...`

### Console - Testar API

```javascript
// No console do navegador
fetch("https://api.seu-dominio.com/api/v1/users/me", {
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

## ❌ Problemas Comuns

### Erro: "Acesso negado. Token não fornecido"

**Causa**: Cookie não está sendo enviado  
**Soluções**:

1. ✅ Verifique se está usando HTTPS
2. ✅ Confirme `NEXT_PUBLIC_API_BASE_URL` correto
3. ✅ Verifique `ALLOWED_ORIGINS` no backend
4. ✅ Confira `COOKIE_DOMAIN` no backend

### Erro: "CORS policy blocked"

**Causa**: Backend não permite a origem do frontend  
**Solução**: Adicione a URL do frontend em `ALLOWED_ORIGINS`

```env
# Backend
ALLOWED_ORIGINS=https://front.com,https://www.front.com
```

### Erro: "Mixed Content"

**Causa**: Frontend HTTPS tentando acessar backend HTTP  
**Solução**: Configure HTTPS no backend

### Cookie não persiste após refresh

**Causa 1**: Cookie com domínio errado  
**Solução**: Ajuste `COOKIE_DOMAIN` no backend

**Causa 2**: Cookie expirado  
**Solução**: Verifique o `maxAge` no backend (padrão: 12h)

## 📝 Diferenças Dev vs Produção

| Configuração    | Desenvolvimento                | Produção                         |
| --------------- | ------------------------------ | -------------------------------- |
| API URL         | `http://localhost:8080/api/v1` | `https://api.dominio.com/api/v1` |
| Cookie Secure   | `false`                        | `true`                           |
| Cookie SameSite | `lax`                          | `none`                           |
| HTTPS           | Opcional                       | Obrigatório                      |
| CORS Origin     | Permite localhost              | Apenas domínios listados         |

## 🚀 Deploy Rápido

### Vercel

```bash
# 1. Configure as variáveis de ambiente no dashboard
NEXT_PUBLIC_API_BASE_URL=https://api.seu-dominio.com/api/v1

# 2. Deploy
vercel --prod
```

### Netlify

```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Configure variáveis no dashboard
```

### Docker

```bash
# docker-compose.yml
services:
  web:
    build: ./web
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.seu-dominio.com/api/v1
    ports:
      - "3000:3000"
```

## 🔗 Links Úteis

- [Guia de Autenticação do Backend](./server/docs/production-auth-config.md)
- [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## ✨ Resumo

**Frontend não precisa de alterações! Apenas:**

1. Configure `NEXT_PUBLIC_API_BASE_URL` com HTTPS
2. Configure `ALLOWED_ORIGINS` no backend
3. Use HTTPS em ambos (frontend e backend)
4. Teste com DevTools

Os headers Origin e cookies são gerenciados automaticamente! 🎉
