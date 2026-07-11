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
    ├── enviroments.js
    ├── __tests__/
    │   ├── chat-processor.test.js
    │   └── placeholder.test.js
    ├── assets/
    │   └── docs/
    │       ├── 01-identity.md
    │       ├── 02-ecosystem.md
    │       └── 03-capabilities.md
    ├── modules/
    │   ├── weave-ai-chat/
    │   │   ├── agents/
    │   │   │   ├── chat.graph.js
    │   │   │   └── nodes/
    │   │   │       ├── contextualizer.node.js
    │   │   │       ├── dynamic-agent.node.js
    │   │   │       ├── general-assistant.node.js
    │   │   │       ├── orchestrator.node.js
    │   │   │       ├── project-manager.node.js
    │   │   │       └── tool-executor.node.js
    │   │   ├── engines/
    │   │   │   ├── react.engine.js
    │   │   │   ├── smart-response.engine.js
    │   │   │   └── thinking.engine.js
    │   │   ├── prompts/
    │   │   │   ├── agent-prompts.js
    │   │   │   ├── builder.js
    │   │   │   ├── index.js
    │   │   │   ├── persona.js
    │   │   │   └── utils.js
    │   │   ├── chat.processor.js
    │   │   ├── compose-prompt.js
    │   │   └── reasoning.engine.js
    │   └── weave-ai-proactive/
    │       ├── agents/
    │       │   ├── nodes/
    │       │   │   ├── analyst.node.js
    │       │   │   ├── orchestrator.node.js
    │       │   │   ├── researcher.node.js
    │       │   │   └── writer.node.js
    │       │   ├── prompts/
    │       │   │   ├── analyst.prompt.js
    │       │   │   ├── orchestrator.prompt.js
    │       │   │   ├── researcher.prompt.js
    │       │   │   └── writer.prompt.js
    │       │   ├── proactive.graph.js
    │       │   └── proactive.state.js
    │       └── proactive.processor.js
    ├── router/
    ├── services/
    │   ├── cache/
    │   │   ├── redis-queue-keys.js
    │   │   ├── redis-queues.js
    │   │   └── redis.client.js
    │   ├── database/
    │   │   └── postgres.client.js
    │   ├── llm/
    │   │   ├── llm-provider.client.js
    │   │   └── llm.client.js
    │   ├── graceful-shutdown.js
    │   └── logger.js
    ├── tools/
    │   ├── brain/
    │   │   ├── brain.action.js
    │   │   └── brain.schema.js
    │   ├── notes/
    │   │   ├── note-comments.action.js
    │   │   ├── note-comments.schema.js
    │   │   ├── note.action.js
    │   │   └── note.schema.js
    │   ├── organization/
    │   │   ├── org-areas.action.js
    │   │   ├── org-areas.schema.js
    │   │   ├── org-members.action.js
    │   │   ├── org-members.schema.js
    │   │   ├── organization.action.js
    │   │   └── organization.schema.js
    │   ├── profile/
    │   │   ├── profile.action.js
    │   │   └── profile.schema.js
    │   ├── projects/
    │   │   ├── project.action.js
    │   │   └── project.schema.js
    │   ├── web/
    │   │   ├── search.action.js
    │   │   ├── search.schema.js
    │   │   ├── web-browser.action.js
    │   │   └── web-browser.schema.js
    │   └── tool-dispatcher.js
    └── utils/
        ├── entity-context.loader.js
        ├── files-parser.js
        ├── markdown-rules.js
        └── state-graph.js
```

## Descrição das Pastas Principais

- **`src/assets`**: Contém recursos estáticos e documentos da identidade do sistema e capabilities da IA.
- **`src/modules`**: A lógica principal e os fluxos de trabalho do Weave AI Engine. Subdividido por áreas como `weave-ai-chat` (agentes dinâmicos, motores de raciocínio e o processor de chat) e `weave-ai-proactive` (processamento assíncrono proativo).
- **`src/services`**: Camada de infraestrutura, contendo serviços compartilhados, clientes de banco de dados (PostgreSQL), clientes de cache (Redis), conexões com provedores de IA (LLM) e utilitários globais como Logger e gerenciador de Graceful Shutdown.
- **`src/tools`**: Implementação das ferramentas que o motor de IA pode executar (Tools/Actions). É estruturado por domínios de negócio (Brain, Notes, Organization, Profile, Projects, Web) unificados pelo `tool-dispatcher.js`.
- **`src/utils`**: Utilitários gerais do sistema, como parser de markdown, parseador de arquivos, State Graph customizado e carregador de contextos.
- **`src/__tests__`**: Testes automatizados do motor.
