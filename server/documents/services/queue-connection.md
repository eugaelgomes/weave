# Queue Connection (`src/services/queue/connection.js`)

## O que faz

Cria e exporta um cliente Redis compartilhado (ioredis) para filas e cache.

## Entrada e saida

- Entrada: `REDIS_URL` no ambiente
- Saida: instancia unica de cliente Redis

## Regras importantes

- `enableReadyCheck: false` e `maxRetriesPerRequest: null` estao configurados para cenarios de fila.
- Em erro de conexao, registra log com prefixo `[Redis]`.

## Uso comum

- Produtores de jobs no server.
- Consumidores no worker/engine (via mesmas chaves de fila).
