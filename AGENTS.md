# Contribution rules for agents

This repository is a multi-package application. Treat the following as the
default contract unless a more specific `AGENTS.md` exists in the directory
being changed.

## Repository map

- `web/`: Next.js frontend. Read `web/AGENTS.md` before changing it.
- `server/`: Express API and authentication.
- `worker/`: background jobs.
- `llm/`: LLM execution engine.
- `packages/shared/`: database, logging, and shared runtime code.

## Working agreement

- Inspect the affected package and its scripts before changing code.
- Keep a change focused. Do not mix refactors, formatting, or unrelated fixes
  with a feature or bug fix.
- Never add secrets, credentials, `.env` files, generated output, or private
  production data to Git.
- Run the narrowest relevant validation first, then the package-level check
  when practical. State what was and was not run in the pull request.
- Do not change database schemas, migrations, authentication, permissions, or
  deployment configuration without calling out the operational impact.

## Commits

All commit subjects must be in English and follow Conventional Commits:

```text
<type>(<scope>): <imperative summary>
```

- Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
  `refactor`, `revert`, `style`, `test`.
- `scope` is optional, lowercase, and identifies the affected area, such as
  `agent`, `auth`, `web`, `server`, or `database`.
- Start the summary with a lowercase imperative verb; keep it specific, under
  100 characters, and without a trailing period.
- Make commits atomic. Never commit unrelated working-tree changes.

Examples:

```text
feat(agent): add session management
fix(auth): prevent session fixation
refactor(web): simplify agent settings layout
docs(contributing): define pull request conventions
```

## Pull requests

- Use the same Conventional Commit format for the PR title.
- Complete the repository PR template: summary, validation, and risk or
  migration impact.
- Keep each PR focused and explain any deliberate follow-up work.
- Do not claim tests passed unless they were actually run.
