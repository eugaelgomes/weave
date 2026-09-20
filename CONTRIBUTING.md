# Contributing to Weave

Thanks for contributing. This guide applies to humans and coding agents alike.
For agent-specific repository context, see [AGENTS.md](AGENTS.md).

## Before opening a pull request

1. Start from the current target branch and keep your branch focused on one
   concern.
2. Read the instructions in the repository root and in the package you are
   changing. For frontend work, this includes `web/AGENTS.md`.
3. Install dependencies with `npm install`. This also enables the local commit
   message hook. If hooks were previously disabled, run `npm run hooks:install`.
4. Run the relevant package checks. Common root commands are:

   ```bash
   npm run lint
   npm run typecheck
   ```

## Commit messages

Use Conventional Commits, in English:

```text
<type>(<scope>): <imperative summary>
```

`scope` is optional. The accepted types are `build`, `chore`, `ci`, `docs`,
`feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`.

Good examples:

```text
feat(agent): add session management
fix(auth): prevent session fixation
chore(web): update editor dependencies
```

Keep the summary lowercase, imperative, specific, below 100 characters, and
without a final period. Each commit should contain one coherent change.

The local hook rejects invalid messages. You can also validate a subject before
committing:

```bash
npm run validate:commit -- "feat(agent): add session management"
```

## Pull requests

PR titles use the exact same convention as commit subjects. Fill in the PR
template honestly:

- summarize the change and the motivation;
- list commands and manual checks actually performed;
- state migration, security, operational, or rollout risk — or explicitly say
  that there is none.

The CI validates the PR title. Reviewers may request that mixed or unrelated
changes be split before merge.
