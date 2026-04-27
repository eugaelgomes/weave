# Secrets Manager (`src/services/secrets/index.js`)

## O que faz

Recupera a chave secreta da aplicacao a partir da variavel de ambiente `SECRET_KEY`.

## Entrada e saida

- Entrada: nenhuma
- Saida: string com a secret key

## Regras importantes

- Se `SECRET_KEY` nao estiver definida, lanca erro imediatamente.
- Serve para evitar inicializacao de fluxos sensiveis sem configuracao minima.

## Uso comum

- Assinatura e validacao de tokens.
- Qualquer fluxo que dependa de segredo criptografico global.
