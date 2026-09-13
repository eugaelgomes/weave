# Storage Access Control (`src/services/storage/access-control.js`)

## O que faz

Valida se um usuario tem permissao para acessar um arquivo do storage com base na key/path.

## Entrada e saida

- Entrada: `userId`, `key` do arquivo no bucket
- Saida: `true` quando permitido
- Erro: `StorageAccessError` (403) quando acesso negado ou key invalida

## Como valida

- Interpreta o path e detecta tipo de recurso:
  - `user-owned` (backups, images, profile)
  - `note`
  - `project`
  - `workspace`
- Quando necessario, consulta banco para validar colaboracao/membership:
  - `note_collaborators`
  - `project_members`
  - `workspace_members`

## Regras importantes

- Usuario dono direto do recurso ja passa sem consulta adicional.
- Remove prefixos de namespace e normaliza barras para evitar bypass por formataçao de path.

## Uso comum

- Gate de seguranca antes de disponibilizar download/visualizacao de arquivos.
