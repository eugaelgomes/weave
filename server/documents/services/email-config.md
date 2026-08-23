# Email Config Service (`src/services/email/config.js`)

## O que faz

Expõe um `MailService` singleton que valida payload de email e enfileira envio no Redis.

## Entrada e saida

- Entrada: `mailOptions` (`to`, `subject`, `html/text`, `cc`, `bcc`, `replyTo`, `from`)
- Saida: retorno do enfileiramento (`queued/success`)

## Regras importantes

- Campos obrigatorios: `to` e `subject`.
- Usa `EMAIL_FROM` como remetente padrao.
- Fora de producao, usa fallback `Weave <onboarding@resend.dev>`.
- Normaliza destinatarios para array e valida formatos basicos de estrutura.

## Uso comum

- Fluxos de convite, recuperacao de senha, notificacoes e comunicacoes transacionais.
