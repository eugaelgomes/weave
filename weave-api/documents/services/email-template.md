# Email Template (`src/services/email/mail-template.js`)

## O que faz

Gera HTML e texto simples padronizados para emails da aplicacao.

## Entrada e saida

- Entrada: opcoes de template (titulo, saudacao, paragrafos, CTA, rodape, etc.)
- Saida: objeto `{ html, text }`

## Regras importantes

- Aplica escape HTML para evitar injecao de conteudo.
- Monta blocos opcionais: preheader, botao CTA, caixa de informacao e rodape.
- Usa paleta visual consistente da marca.
- `CONTACT_EMAIL` pode ser configurado por env var.

## Uso comum

- Construir templates de emails transacionais com layout unificado.
