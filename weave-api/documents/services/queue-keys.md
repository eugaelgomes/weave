# Queue Keys (`src/services/queue/queue-keys.js`)

## O que faz

Centraliza as chaves Redis usadas nas filas de background e no fluxo com o engine.

## Entrada e saida

- Entrada: variaveis de ambiente opcionais para override das keys
- Saida: funcoes que retornam keys resolvidas e objeto `REDIS_QUEUE_KEYS`

## Regras importantes

- Cada key tem valor default e pode ser sobrescrita por env var.
- Server e worker precisam resolver exatamente a mesma key para funcionar.
- Tambem define prefixo de resposta do engine (`responses:<requestId>`).

## Uso comum

- Definicao das filas de email, exportacao de backup, verificacao de dominio e uso de plano.
- Integracao assíncrona com requests/responses de LLM no engine.
