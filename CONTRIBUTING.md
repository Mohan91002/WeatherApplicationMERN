# Contributing

This project uses a **feature-branch workflow**. `main` is always deployable;
all work happens on short-lived branches merged via pull request.

## 1. Branch off `main`

```bash
git checkout main
git pull
git checkout -b feature/my-change
```

Name branches by type + short kebab description:

| Prefix | Use for | Example |
| ------ | ------- | ------- |
| `feature/` | new functionality | `feature/hourly-forecast` |
| `fix/`     | bug fixes | `fix/aqi-rounding` |
| `docs/`    | documentation only | `docs/api-examples` |
| `chore/`   | tooling, deps, refactors | `chore/bump-react` |

> Working from the Jira backlog? Name branches after the issue key —
> `feature/WEA-<id>-<slug>` — and put the key in the commit subject (e.g.
> `WEA-113: ...`). See [WORKFLOW.md](WORKFLOW.md) for the issue → branch → PR map.

## 2. Develop & test locally

See [README → Getting started](README.md#getting-started) to run the apps. Run
the tests before pushing:

```bash
cd backend && npm test          # node:test unit + supertest integration
cd frontend && npm test         # vitest
```

## 3. Commit

- Keep commits focused; use imperative subject lines ("Add hourly forecast").
- Reference issues where relevant.

## 4. Open a pull request

1. Push your branch and open a PR against `main`.
2. CI ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) runs the
   **backend + frontend tests on every PR**.
3. Get a review and keep your branch up to date with `main`.
4. Merge when green (squash preferred), then delete the branch.

**Deploys never run from a pull request.** They run only when changes land on
`main` (or via manual dispatch): the API image is built & pushed and the SPA is
published — see [cloud/DEPLOY.md](cloud/DEPLOY.md).

## Architectural rule

Keep **all business logic in the Node/Express backend** (`backend/`). The React
frontend (`frontend/`) is presentation-only — it renders what the API returns
and holds no domain logic.

## First-time remote (optional)

This repository was initialized locally. To enable pull requests, add a remote
and push:

```bash
git remote add origin <your-repo-url>
git push -u origin main
git push -u origin feature/my-change   # then open the PR
```
