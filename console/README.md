# Weave Console

Painel administrativo do Weave Notes para gerenciamento de usuários, organizações e planos.

## Stack

- **Next.js 16** com App Router
- **TypeScript**
- **Tailwind CSS 4**
- **React Icons**

## Desenvolvimento

```bash
npm install
npm run dev    # http://localhost:3002
```

## Variáveis de Ambiente

| Variável | Descrição | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_APP_URL` | URL do app principal | `http://localhost:3000` |

## Funcionalidades

- **Dashboard**: Visão geral com estatísticas do sistema
- **Usuários**: Listar, buscar, visualizar detalhes, editar, ativar/desativar
- **Organizações**: Listar, buscar, visualizar detalhes + membros, editar, ativar/desativar
- **Planos**: Visualizar planos com contagem de assinantes

## Autenticação

O console utiliza o mesmo JWT do sistema principal. O acesso é restrito a emails definidos na variável `ADMIN_EMAILS` do servidor.
