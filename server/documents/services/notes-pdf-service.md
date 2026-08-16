# Notes PDF Service (`src/modules/notes/services/pdf.service.js`)

## O que faz

Gera um PDF de nota com cabecalho, metadados e blocos de conteudo (texto, tarefa e codigo).

## Entrada e saida

- Entrada: objeto `note` com titulo, descricao, autor, status e blocos
- Saida: `Buffer` do arquivo PDF

## Regras importantes

- Usa `pdfkit` com pagina A4 e margem padrao.
- Mostra contexto de organizacao/projeto quando disponivel.
- Renderiza blocos de codigo com estilo visual dedicado.
- Faz quebra de pagina quando o conteudo se aproxima do limite vertical.

## Uso comum

- Exportar nota para compartilhamento externo ou arquivo offline.
