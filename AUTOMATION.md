# Automation — World Weather (MERN)

Everything that runs **automatically** to keep the repo green, up to date and
secure — plus the local commands and AI "skills" that drive it. No manual steps
are required for day-to-day work.

---

## 1. Local automation

| Trigger | What runs | Where |
| ------- | --------- | ----- |
| `git commit` | `lint` + `format:check` on both packages (pre-commit hook) | `.husky/pre-commit` |
| `npm run quality` | lint → format-check → typecheck → test:coverage | root `package.json` |
| `npm run format` / `lint:fix` | auto-format / auto-fix both packages | root `package.json` |

**One-time setup:** `npm install` at the repo root (installs Husky and wires
`core.hooksPath`). Emergency bypass: `git commit --no-verify`.

### Per-package scripts

| Script | Backend | Frontend |
| ------ | ------- | -------- |
| `lint` / `lint:fix` | ESLint (flat config) | ESLint (flat config) |
| `format` / `format:check` | Prettier | Prettier |
| `typecheck` | — (plain JS) | `tsc --noEmit` |
| `test` / `test:coverage` | `node --test` / `c8` | `vitest` / `@vitest/coverage-v8` |

Shared config: [`.prettierrc.json`](.prettierrc.json) · [`.prettierignore`](.prettierignore) · [`.editorconfig`](.editorconfig) ·
[`backend/eslint.config.js`](backend/eslint.config.js) · [`frontend/eslint.config.js`](frontend/eslint.config.js).

---

## 2. Continuous integration — [`.github/workflow-templates/ci.yml`](.github/workflow-templates/ci.yml)

> **Activation:** the workflow files live in
> [`.github/workflow-templates/`](.github/workflow-templates/) and must be copied
> into `.github/workflows/` once (see §2a) — they could not be committed to
> `.github/workflows/` directly because this branch was pushed by a GitHub App
> without the `workflows` permission.

On every PR and push to `main`, two parallel jobs run the full gate:

- **backend** — `npm ci` → lint → format:check → test:coverage → upload coverage artifact.
- **frontend** — `npm ci` → lint → format:check → typecheck → test:coverage → build → upload coverage artifact.

Runs are path-cached by each package's `package-lock.json`, and superseded runs
are cancelled via a `concurrency` group.

### 2a. Activating the workflows (one-time)

```bash
npm run automation:install-workflows   # copies workflow-templates/*.yml -> .github/workflows/
git add .github/workflows && git commit -m "ci: activate CI, CodeQL and auto-merge workflows"
git push
```

---

## 3. Dependency automation — [`.github/dependabot.yml`](.github/dependabot.yml)

Weekly (npm monthly) Dependabot PRs for **backend**, **frontend**, **root
tooling**, **GitHub Actions** and the **Docker** image. Minor/patch updates are
grouped per ecosystem to reduce noise; labels + commit prefixes are applied
automatically.

### Auto-merge — [`.github/workflow-templates/dependabot-auto-merge.yml`](.github/workflow-templates/dependabot-auto-merge.yml)

Dependabot **patch/minor** PRs are auto-approved and squash-merged once required
checks pass. **Major** bumps stay open for human review.

> Enable **Allow auto-merge** in repo settings and require the `ci` jobs as
> required status checks on `main` for this to take effect.

---

## 4. Security scanning — [`.github/workflow-templates/codeql.yml`](.github/workflow-templates/codeql.yml)

CodeQL SAST for the JS/TS code runs on PRs, on `main`, and weekly. Findings land
in the repo's **Security → Code scanning** tab. (Terraform already enables ECR
scan-on-push for the container image.)

---

## 5. Deploy automation (existing)

| Workflow | Trigger | Effect |
| -------- | ------- | ------ |
| [`deploy.yml`](.github/workflows/deploy.yml) | push to `main` (or manual) | test → build/push API image to ECR → App Runner deploy → sync SPA to S3 → CloudFront invalidate |
| [`pages.yml`](.github/workflows/pages.yml) | push to `main` touching `frontend/**` | build SPA and publish to GitHub Pages |

Both are gated on the test jobs, so a red build never ships.

---

## 6. AI skills — [`.claude/skills/`](.claude/skills/)

Reusable playbooks the coding agent can invoke:

| Skill | Purpose |
| ----- | ------- |
| [`quality-gate`](.claude/skills/quality-gate/SKILL.md) | Run/report the full local gate |
| [`add-api-endpoint`](.claude/skills/add-api-endpoint/SKILL.md) | Add an endpoint following the backend-owns-all-logic rule |
| [`release-check`](.claude/skills/release-check/SKILL.md) | Pre-deploy verification + prerequisites |
