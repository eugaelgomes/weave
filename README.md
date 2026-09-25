```text
            ████╗       ████╗   ██████████████╗     ██████████╗    ████╗        ████╗  ██████████████╗  
            ████║       ████║   ██████████████║     ██████████║    ████║        ████║  ██████████████║  
            ████║       ████║   ████╔═════════╝  ████╔══════████╗  ████║        ████║  ████╔═════════╝  
            ████║       ████║   ████║            ████║      ████║  ████║        ████║  ████║            
            ████║ ████╗ ████║   ██████████╗      ███████████████║  ████║        ████║  ██████████╗      
            ████║ ████║ ████║   ██████████║      ███████████████║  ████║        ████║  ██████████║      
            ████████████████║   ████╔═════╝      ████╔══════████║   ╚████╗    ████╔╝   ████╔═════╝      
            ████████████████║   ████║            ████║      ████║    ╚████╗  ████╔╝    ████║            
            ╚██████████████╔╝   ██████████████╗  ████║      ████║     ╚████████╔╝      ██████████████╗  
             ╚████████████╔╝    ██████████████║  ████║      ████║      ╚██████╔╝       ██████████████║  
```

## Weave as an AI Harness

Weave isn't just a collection of AI features bolted onto a project management tool — it's designed as an **AI harness**: a structured layer that sits between raw LLM capabilities and real-world execution, giving agents the context, tools, and guardrails they need to act reliably.

In practice, this means:

- **Human-in-the-loop by design** — agents propose, surface risks, and draft actions, but critical decisions and execution boundaries remain under human control. Autonomy is scoped, not absolute.
- **Context-aware orchestration** — agents operate within your workspace's actual data (tasks, notes, knowledge bases), not in isolation, so their outputs are grounded in what your team is actually doing.
- **External systems as tools** — Weave is built to turn outside services, APIs, and platforms into tools an agent can actually use. Connectivity isn't an afterthought; it's a core primitive, letting agents reach beyond the workspace into whatever integrations your workflow depends on.
- **Composable tooling** — instead of a single monolithic AI assistant, Weave lets you wire together specific tools, knowledge sources, and workflows per agent, matching the harness to the task rather than forcing one general-purpose agent to do everything.
- **Predictable, auditable behavior** — because agents run inside defined modules with clear inputs/outputs, their actions are traceable back to what triggered them, which matters as autonomy increases.

The goal is to let AI handle the repetitive orchestration and pattern-matching work, while humans stay the final checkpoint for judgment calls — turning Weave from "a tool with AI features" into **a harness that turns your entire toolchain — internal and external — into something agents can safely act on**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)


## Quickstart

The fastest way to initialize a new Weave workspace is directly using `npx` (no cloning required):

```bash
npx github:eugaelgomes/theweave --dir my-weave-app -y
```

## Basic Usage (Local Development)

To run the full multi-package architecture locally:

**Prerequisites:**
- Node.js 20+
- Docker & Docker Compose v2
- Doppler CLI (for secret management)

**1. Start infrastructure**
```bash
docker compose up -d
```

**2. Configure secrets & install**
```bash
doppler login
doppler setup   # select project: weave-api, config: dev
npm install
```
*(For plain `.env` usage, copy `.env.example` to `.env`)*

**3. Setup database**
```bash
npm run db:migrate
npm run db:generate
```

**4. Start all services**
```bash
npm run dev
```
*(This starts the Next.js UI, Core API, Background Worker, and the LLM engine simultaneously).*

## Deeper Documentation

Weave is a monorepo consisting of several independent workspaces. For more detailed information on architecture, environment variables, or deployment strategies, please refer to the specific documentation:
- [Server API (weave-notes-api)](./server)
- [Web Frontend (weave-notes)](./web)
- [Worker Processor (weave-worker)](./worker)
- [LLM Engine (weave-engine)](./llm)

## Contributing

We welcome contributions! Please see our [AGENTS.md](./AGENTS.md) for contribution rules and working agreements. 
To get started:
1. Fork the repo and create your branch (`git checkout -b feature/amazing-feature`)
2. Follow the conventional commit format (`feat(scope): message`)
3. Ensure you run the linting and tests before opening a PR:
```bash
npm run lint
npm run typecheck
```

## License

MIT. See the [LICENSE](LICENSE) file for more details.
