# Domain Verifier (`src/services/domains/domain-verifier.js`)

## O que faz

Verifica se um dominio possui o token TXT esperado para validacao.

## Entrada e saida

- Entrada: `domainName`, `expectedToken`
- Saida: `{ isVerified, checkedHosts }`

## Regras importantes

- Consulta primeiro `_weave-challenge.<dominio>`.
- Se necessario, tambem consulta TXT do dominio raiz.
- Trata erros DNS nao fatais (ex.: `ENOTFOUND`, `ENODATA`) como lista vazia.
- Lanca erro quando o token esperado e invalido/vazio.

## Uso comum

- Fluxo de verificacao de dominio customizado antes de liberar uso em organizacoes.
