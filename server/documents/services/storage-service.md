# Storage Service (`src/services/storage/index.js`)

## O que faz

Gerencia upload/download/delete de arquivos no DigitalOcean Spaces (API compativel com S3).

## Entrada e saida

- Entrada: buffers, mime types, IDs de entidade (user/note/project/org), nomes de arquivo
- Saida: metadados de arquivo (`key`, `url`, `size`, `fileName`, etc.)

## Principais grupos de funcionalidade

- Upload de backup (`uploadBackup`)
- Upload generico (`uploadImage`)
- Download e remocao (`downloadFile`, `deleteImage`)
- Uploads por contexto:
  - Nota: icone, banner, arquivo, imagem de documento
  - Comentario de nota: anexos
  - Projeto: icone e arquivo
  - Usuario: avatar
  - Organizacao: logo e banner
- Utilitarios:
  - extensao por MIME
  - validacao de tipo/tamanho de imagem
  - extração de key por URL

## Regras importantes

- Exige configuracao completa de credenciais/endpoint/bucket.
- Normaliza paths por pastas para facilitar governanca de acesso.
- Alguns uploads usam ACL publica (`public-read`) e backups usam ACL privada.

## Uso comum

- Midia e anexos de notas/projetos.
- Exportacao e armazenamento de backups.
