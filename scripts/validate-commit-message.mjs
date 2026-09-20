#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const allowedTypes = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

const usage = `Expected Conventional Commit format:\n  <type>(<scope>): <imperative summary>\n\nAllowed types: ${allowedTypes.join(", ")}\nExample: feat(agent): add session management`;

function getSubject(args) {
  if (args[0] === "--title") {
    return args.slice(1).join(" ").trim();
  }

  if (args.length !== 1) {
    throw new Error(usage);
  }

  return existsSync(args[0])
    ? readFileSync(args[0], "utf8").split("\n")[0].trim()
    : args[0].trim();
}

function validate(subject) {
  const typePattern = allowedTypes.join("|");
  const conventionalCommit = new RegExp(
    `^(${typePattern})(\\([a-z0-9][a-z0-9-]*\\))?!?: [a-z][^\\r\\n.]{0,97}[^\\r\\n.]$`,
  );

  if (!subject || !conventionalCommit.test(subject)) {
    throw new Error(`${usage}\n\nReceived: ${subject || "(empty)"}`);
  }

  if (subject.length > 100) {
    throw new Error(`Commit subject must be at most 100 characters. Received: ${subject.length}`);
  }
}

try {
  const subject = getSubject(process.argv.slice(2));
  validate(subject);
} catch (error) {
  console.error(`Invalid commit or pull request title.\n\n${error.message}`);
  process.exit(1);
}
