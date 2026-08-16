# Queue Controller (`src/services/queue/queue-controller.js`)

## O que faz

Fornece helpers para enfileirar jobs no Redis usando listas (`LPUSH`).

## Entrada e saida

- Entradas: key de lista e payloads JSON-serializaveis
- Saida: status de enfileiramento (`{ success: true, queued: true }`)

## Jobs suportados

- Email (`enqueueEmailJob`)
- Verificacao de dominio (`enqueueDomainVerificationJob`)
- Consumo de uso de plano (`enqueuePlanUsageJob`)
- Exportacao de backup (`enqueueBackupExportJob`)

## Regras importantes

- Sempre inclui metadados como `queuedAt`.
- Alguns jobs incluem `retryCount` para estrategias de reprocessamento.
- `enqueuePlanUsageJob` gera `eventId` automaticamente quando nao informado.

## Uso comum

- Controllers e services que precisam disparar trabalho assíncrono sem bloquear request HTTP.
