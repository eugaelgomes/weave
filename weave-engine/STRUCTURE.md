# Estrutura do Weave Engine

Este documento descreve a estrutura de diretórios e arquivos do **Weave Engine**, organizada de forma a facilitar a navegação e o entendimento da arquitetura do projeto.

## Árvore de Diretórios

```text
weave-engine/
├── Dockerfile
├── Dockerfile.dev
├── docker-entrypoint.sh
├── eslint.config.mjs
├── nodemon.json
├── package.json
├── package-lock.json
└── src/
    ├── index.js
    ├── instrument.js
    ├── __tests__/
    │   ├── chat-processor.test.js
    │   └── placeholder.test.js
    ├── ai-core/
    │   ├── brain-docs/
    │   │   ├── 01-identity.md
    │   │   ├── 02-ecosystem.md
    │   │   └── 03-capabilities.md
    │   ├── context/
    │   │   └── entity-context.loader.js
    │   ├── markdown/
    │   │   └── markdown-rules.js
    │   ├── orchestration/
    │   │   ├── engines/
    │   │   │   ├── react.engine.js
    │   │   │   ├── smart-response.engine.js
    │   │   │   └── thinking.engine.js
    │   │   ├── multi-agent/
    │   │   │   ├── index.js
    │   │   │   └── state-graph.js
    │   │   └── reasoning.engine.js
    │   ├── prompts/
    │   │   ├── agent-prompts.js
    │   │   ├── builder.js
    │   │   ├── index.js
    │   │   ├── persona.js
    │   │   └── utils.js
    │   └── providers/
    │       ├── llm-provider.client.js
    │       └── llm.client.js
    ├── config/
    │   └── environments.js
    ├── infrastructure/
    │   ├── cache/
    │   │   ├── redis-queue-keys.js
    │   │   └── redis.client.js
    │   ├── database/
    │   │   └── postgres.client.js
    │   ├── graceful-shutdown.js
    │   └── logger.js
    ├── tools/
    │   ├── tool-dispatcher.js
    │   └── domains/
    │       ├── brain/
    │       │   ├── brain.action.js
    │       │   └── brain.schema.js
    │       ├── notes/
    │       │   ├── note-comments.action.js
    │       │   ├── note-comments.schema.js
    │       │   ├── note.action.js
    │       │   └── note.schema.js
    │       ├── organization/
    │       │   ├── org-areas.action.js
    │       │   ├── org-areas.schema.js
    │       │   ├── org-members.action.js
    │       │   ├── org-members.schema.js
    │       │   ├── organization.action.js
    │       │   └── organization.schema.js
    │       ├── profile/
    │       │   ├── profile.action.js
    │       │   └── profile.schema.js
    │       ├── projects/
    │       │   ├── project.action.js
    │       │   └── project.schema.js
    │       └── web/
    │           ├── search.action.js
    │           ├── search.schema.js
    │           ├── web-browser.action.js
    │           └── web-browser.schema.js
    └── workflows/
        ├── proactive-jobs/
        │   ├── proactive.processor.js
        │   └── agents/
        │       ├── proactive.graph.js
        │       ├── proactive.state.js
        │       ├── nodes/
        │       │   ├── analyst.node.js
        │       │   ├── orchestrator.node.js
        │       │   ├── researcher.node.js
        │       │   └── writer.node.js
        │       └── prompts/
        │           ├── analyst.prompt.js
        │           ├── orchestrator.prompt.js
        │           ├── researcher.prompt.js
        │           └── writer.prompt.js
        └── reactive-chat/
            ├── chat.processor.js
            └── compose-prompt.js
```

## Descrição das Pastas Principais

- **`src/ai-core`**: Contém a lógica principal de Inteligência Artificial, incluindo os provedores de LLM, os motores de inferência/raciocínio (ReAct, Thinking, Smart Response), os prompts utilizados e o gerenciamento de contexto.
- **`src/config`**: Configurações gerais do sistema e de variáveis de ambiente.
- **`src/infrastructure`**: Camada de infraestrutura, contendo clientes de banco de dados (PostgreSQL), clientes de cache (Redis) e utilitários globais como Logger e gerenciador de Graceful Shutdown.
- **`src/tools`**: Implementação das ferramentas que o motor de IA pode executar (Tools/Actions). É estruturado por domínios de negócio (Brain, Notes, Organization, Profile, Projects, Web).
- **`src/workflows`**: Define os fluxos de trabalho do motor, divididos em jobs proativos (agendados ou disparados por eventos de forma proativa) e chats reativos (interações em tempo real com o usuário).
- **`src/__tests__`**: Testes automatizados do motor.
