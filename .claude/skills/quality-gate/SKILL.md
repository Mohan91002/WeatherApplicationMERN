---
name: quality-gate
description: Run the full local quality gate (lint, format-check, type-check, tests with coverage) for the World Weather MERN repo and report pass/fail. Use before committing, opening a PR, or deploying.
---

# Quality gate

Run every automated check locally, exactly as CI does, and report the result.

## Steps

1. Install dependencies once if `node_modules` is missing:

   ```bash
   cd backend && npm ci
   cd ../frontend && npm ci
   ```

2. Run the whole gate from the repo root:

   ```bash
   npm run quality
   ```

   This runs, in order: `lint` → `format:check` → `typecheck` → `test:coverage`
   across both packages. To fix formatting/lint automatically first:

   ```bash
   npm run format
   npm run lint:fix
   ```

3. Confirm the outcome:
   - backend `node --test` → all pass
   - frontend `vitest` → all pass
   - both coverage tables print, and `format:check` reports "All matched files use Prettier code style!"

## Notes

- The pre-commit hook (`.husky/pre-commit`) runs `lint` + `format:check` on every commit.
- CI (`.github/workflows/ci.yml`) runs the full gate plus `npm run build` on every PR.
- Never claim the gate passed without the command output showing it.
