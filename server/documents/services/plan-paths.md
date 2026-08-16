# Plan Paths (`src/services/plans/plan-paths.js`)

## O que faz

Centraliza a estrutura padrao de plano e os caminhos JSON usados para leitura/atualizacao de limites e consumo.

## Exportacoes

- `PLAN_STRUCTURE`: modelo base do JSON de plano (`details`)
- `PLAN_PATHS`: caminhos de configuracao do plano (limites, billing, IA, features)
- `USAGE_PATHS`: caminhos de uso/consumo no `plan_usages.usage_details`

## Regras importantes

- Paths estao em dot notation para facilitar validacao e update em JSONB.
- Mantem referencia unica para evitar strings "soltas" no codigo.

## Uso comum

- Regras de limite por plano.
- Atualizacao de consumo mensal (mensagens IA, exportacoes, storage).
