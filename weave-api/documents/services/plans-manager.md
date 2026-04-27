# Plans Manager (`src/services/plans/manager.js`)

## O que faz

Gerencia leitura de planos e consumo de uso (IA, notas, exportacao, storage), delegando persistencia ao `PlansRepository`.

## Principais responsabilidades

- Listar planos (`getAllPlans`)
- Converter path dot notation para formato Postgres (`toPgPath`)
- Consumir eventos de uso:
  - `consumeAiMessage`
  - `consumeNoteCreation`
  - `consumeStorage`
  - `consumeExport`
- Atualizar ultima atividade (`updateLastActivity`)
- Definir plano padrao para novo usuario (`setDefaultPlanForNewUser`)

## Regras importantes

- Atualizacoes usam caminhos centralizados em `USAGE_PATHS`.
- Em IA, pode incrementar mensagens e tokens estimados.
- Ao criar usuario, tenta associar plano default de signup quando necessario.

## Uso comum

- Fluxos de billing/limites.
- Controle de consumo para features pagas e governanca de plano.
