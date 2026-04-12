# Auth Module

Módulo responsável por login, logout e autenticação OAuth (Google).

## Rotas

| Método | Rota                            | Auth | Middleware                                      | Descrição                         |
| ------ | ------------------------------- | ---- | ----------------------------------------------- | --------------------------------- |
| POST   | `/api/auth`                     | Não  | `requestLimiter`, `loginValidation`, `toString` | Login com email/username + senha  |
| GET    | `/api/auth/sso/google`          | Não  | —                                               | Redireciona para OAuth2 do Google |
| GET    | `/api/auth/sso/google/callback` | Não  | —                                               | Callback do Google OAuth2         |
| POST   | `/api/auth/logout`              | Sim  | `verifyToken`                                   | Encerra sessão e limpa cookie     |

## Fluxo de Login (Credentials)

1. Recebe `login` (email ou username) e `password` no body
2. Valida input via `express-validator` (`loginValidation`)
3. Busca usuário por username ou email (`findUserByUsername`)
4. Rejeita contas com `auth_with_google = true` (deve usar SSO)
5. Verifica `email_verified` — conta não ativada retorna `403`
6. Compara hash bcrypt da senha
7. Gera JWT (HS256, expiração 12h) com payload:
   - `userId`, `username`, `email`, `name`
   - `org_id`, `org_unique_name`, `plan_id`, `org_member_role`
8. Seta cookie `token` (HttpOnly, Secure em produção, SameSite dinâmico)
9. Registra log de autenticação via `authLogs.createLog`
10. Retorna perfil do usuário, organização e dados de assinatura

## Fluxo Google OAuth2

### Início (`/signin/sso/google`)

Redireciona para `accounts.google.com` com `client_id`, `redirect_uri`, scope `openid email profile`.

### Callback (`/signin/sso/google/callback`)

1. Troca authorization code por access token via `oauth2.googleapis.com/token`
2. Busca dados do perfil via Google UserInfo API
3. Resolução de usuário:
   - Busca por `google_id` → encontrou, usa
   - Busca por `email` → encontrou, vincula `google_id` ao existente
   - Não encontrou → cria novo usuário (username gerado: `{email_prefix}_{timestamp}`)
4. Gera JWT (HS256, expiração 24h)
5. Seta cookie `token` e redireciona para `{FRONTEND_URL}/app/home?auth=success`
6. Em caso de erro, redireciona para `{FRONTEND_URL}/?error=auth_failed`

## Logout

- Limpa cookie `token` respeitando `getCookieDomain()`
- Destrói sessão Express (`req.session.destroy`) se existir
- Retorna `200` com confirmação

## Cookie Config

| Propriedade | Dev                        | Produção                   |
| ----------- | -------------------------- | -------------------------- |
| httpOnly    | true                       | true                       |
| secure      | false                      | true                       |
| sameSite    | lax                        | none                       |
| domain      | via `getCookieDomain()`    | via `getCookieDomain()`    |
| maxAge      | 12h (login) / 24h (Google) | 12h (login) / 24h (Google) |

## Repository

**AuthRepository** — singleton exportado com os seguintes métodos:

| Método                                                        | Parâmetros             | Retorno                                                                    |
| ------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `findUserByUsername(username)`                                | email ou username      | Dados completos do usuário + plano + org + usage (query com LATERAL JOINs) |
| `findUserByEmail(email)`                                      | email                  | Dados básicos do usuário                                                   |
| `findUserByGoogleId(googleId)`                                | ID Google              | Dados básicos do usuário                                                   |
| `createUserWithGoogle(googleId, name, email, avatarUrl?)`     | dados do perfil Google | Novo usuário com `auth_with_google = true`                                 |
| `updateUserWithGoogle(userId, googleId, avatarUrl?)`          | IDs                    | Usuário atualizado com vínculo Google                                      |
| `loginLogs(userId, ip, timestamp, success, userAgent)`        | dados do request       | Insere registro em `user_login_logs`                                       |
| `logUserLocation(userId, ip, timestamp, location, userAgent)` | dados do request       | Insere registro em `user_location_logs`                                    |

## Códigos de Resposta

| Status | Cenário                                                       |
| ------ | ------------------------------------------------------------- |
| 200    | Login ou logout bem-sucedido                                  |
| 400    | Validação de input falhou                                     |
| 401    | Credenciais inválidas / conta Google tentando login por senha |
| 403    | Email não verificado                                          |
| 500    | Erro interno                                                  |

## Dependências

- `bcrypt` — hash de senha
- `jsonwebtoken` — geração/verificação JWT
- `axios` — chamadas HTTP para Google OAuth
- `express-validator` — validação de input
- `@/services/secrets` — chave secreta JWT via `secretsManager()`
- `@/config/allowed-origins` — `getCookieDomain()` para domínio dinâmico do cookie
- `@/utils/system_logs/auth-logs` — logging de autenticação
