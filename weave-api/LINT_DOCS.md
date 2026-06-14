# Linting, Formatting, and Code Validation Documentation

This document outlines the linting, formatting, and type-checking systems implemented in the `weave-api` project, detailing active rules and editor/commit validation tooling.

---

## Available Scripts

The following scripts are configured in the `weave-api` [package.json](file:///home/gaelgomes/projetos/theweave/weave-api/package.json) and can be executed using `npm run <command>`:

| Command                | Description                                                                             |
| :--------------------- | :-------------------------------------------------------------------------------------- |
| `npm run lint`         | Analyzes all JS, MJS, CJS, and TS files for ESLint rule violations.                     |
| `npm run lint:fix`     | Automatically resolves autofixable ESLint violations.                                   |
| `npm run typecheck`    | Runs the TypeScript compiler (`tsc`) in check-only mode without emitting output files.  |
| `npm run check`        | Runs both linting and type-checking sequentially (`npm run lint && npm run typecheck`). |
| `npm run format`       | Standardizes file layout and spacing for all JS, JSX, TS, and TSX files using Prettier. |
| `npm run format:check` | Verifies whether codebase files conform to Prettier formatting guidelines.              |

_Note: To execute API-specific scripts from the monorepo root, utilize the `--prefix` flag (e.g., `npm run --prefix weave-api lint`)._

---

## Style and Linting Rules

Code linting is configured via [eslint.config.mjs](file:///home/gaelgomes/projetos/theweave/weave-api/eslint.config.mjs). Below are the primary custom rules enforced:

### JavaScript (`.js`, `.mjs`, `.cjs`)

- **Syntax and Formatting**:
  - `semi`: Requires semicolons at the end of statements (`"error", "always"`).
  - `quotes`: Enforces double quotes except when using template literals (`"error", "double"`).
  - `eol-last`: Requires a newline at the end of files (`"error", "always"`).
  - `no-trailing-spaces`: Prohibits trailing whitespace at the end of lines (`"error"`).
- **Code Quality**:
  - `eqeqeq`: Requires strict equality operators `===` and `!==` (`"error"`).
  - `no-var`: Prohibits the use of `var` in favor of `let` and `const` (`"error"`).
  - `prefer-const`: Warns if variables declared with `let` are never reassigned (`"warn"`).
  - `no-unused-vars`: Warns about unused variables, ignoring parameters prefixed with an underscore `_` (`"warn"`).
  - `no-console`: Warns on `console` statements (`"warn"`).
  - `no-duplicate-imports`: Prohibits importing the same module multiple times within a file (`"error"`).
- **Key Ordering**:
  - `sort-keys`: Enforces natural, case-insensitive ascending sorting of object properties (`"warn"`).

### TypeScript (`.ts`)

TypeScript linting extends JavaScript rules using the recommended configurations from `@typescript-eslint` with specific overrides:

- Warns on `console` statements (`"warn"`).
- Warns on unused TypeScript variables (`@typescript-eslint/no-unused-vars`).
- Bypasses conflicting unused expression rules (`@typescript-eslint/no-unused-expressions` is disabled).

---

## Prettier Configuration

The [.prettierrc](file:///home/gaelgomes/projetos/theweave/weave-api/.prettierrc) configuration defines the following formatting preferences:

- **Indentation**: Uses a 2-space indentation level (`tabWidth: 2`) without tabs (`useTabs: false`).
- **Line Length**: Wraps lines exceeding 80 characters (`printWidth: 80`).
- **Quotes**: Enforces double quotes (`singleQuote: false`).
- **Trailing Commas**: Includes trailing commas where valid in ES5 (`trailingComma: "es5"`).
- **Arrow Functions**: Always includes parentheses around arguments (`arrowParens: "always"`).

---

## Development Lifecycle Validation

Code validation is automated at two phases of the development process:

### 1. In-Editor Validation (VS Code)

Configured at the workspace level in `.vscode/settings.json`, providing real-time feedback:

- **Format on Save**: Formats the active file using Prettier whenever it is saved (`editor.formatOnSave`).
- **Fix on Save**: Automatically applies ESLint autofixes when saving the file.

### 2. Commit-Time Validation (Git Pre-commit Hooks)

Configured at the monorepo root using **Husky** and **lint-staged**:

- Intercepts `git commit` to execute validation checks only on staged files (`git add` files).
- Runs the following checks sequentially:
  1.  Prettier formatting (`prettier --write`).
  2.  ESLint auto-correction (`eslint --fix`).
  3.  TypeScript compiler validation (`npm run typecheck`).
- **Note**: If any check fails or unresolved errors remain, the commit is blocked to prevent broken code from being committed.
