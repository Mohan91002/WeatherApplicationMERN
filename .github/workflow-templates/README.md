# Workflow templates

These three GitHub Actions workflows (`ci`, `codeql`, `dependabot-auto-merge`)
are the repo's automated quality/security gates. They live here — rather than in
`.github/workflows/` — because this branch was pushed by a GitHub App that lacks
the **`workflows`** permission, so writing directly to `.github/workflows/*`
is rejected (`refusing to allow a GitHub App to create or update workflow ...`).

## Activate them

From a clone with normal push rights:

```bash
npm run automation:install-workflows   # copies *.yml into .github/workflows/
git add .github/workflows && git commit -m "ci: activate CI, CodeQL and auto-merge workflows"
git push
```

Once `.github/workflows/` is populated on `main`, the gates run automatically.

`.github/dependabot.yml` is **not** a workflow, so it is already active and
needs no copying.
