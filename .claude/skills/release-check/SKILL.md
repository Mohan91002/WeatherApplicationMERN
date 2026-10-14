---
name: release-check
description: Pre-deployment verification for the World Weather app — confirm the quality gate is green, the build succeeds, and the deploy prerequisites (repo vars/secrets) are in place.
---

# Release check

Run this before merging to `main` (which triggers `deploy.yml`) or dispatching a
manual deploy.

## Steps

1. **Green gate** — run the `quality-gate` skill (`npm run quality`). All lint,
   format, type-check, and tests must pass.
2. **Production build** — confirm the SPA builds with the injected API URL:

   ```bash
   cd frontend
   sed -i 's|__API_BASE_URL__|https://<your-api-host>|g' .env.production   # dry-run only; revert after
   npm run build
   git checkout -- .env.production
   ```

3. **Deploy prerequisites** (see `cloud/DEPLOY.md`). Required repo settings:
   - vars: `AWS_REGION`, `ECR_REPOSITORY`, `APPRUNNER_SERVICE_ARN`, `SPA_BUCKET`,
     `CLOUDFRONT_ID`, `API_BASE_URL`
   - secrets: `AWS_ROLE_ARN`
   - `deploy.yml`'s deploy job is skipped (not failed) while `AWS_REGION` is unset.
4. **Health** — after deploy, confirm `GET /health` returns `{"status":"healthy"}`.

## Notes

- `main` is the only deploy branch; PRs never deploy.
- GitHub Pages (`pages.yml`) publishes the SPA; the API URL is baked in at build time.
