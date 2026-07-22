# Deployment Runbook — World Weather (MERN)

Deploys the **Node/Express API** (container → ECR → App Runner) and the **React SPA**
(S3 + CloudFront). A managed **MongoDB** (e.g. Atlas) is supplied via the
`MONGODB_URI` secret; without it the API runs on the bundled in-memory country
seed. See [PROJECT_PLAN.md](../PROJECT_PLAN.md) for cost/estimates.

> **Two paths:** the AWS runbook below, or the **free-host path** (Fly.io + GitHub
> Pages) just under here — the latter is what the live demo uses.

## Free-host deploy (Fly.io + GitHub Pages)

Zero-cost hosting: the SPA on **GitHub Pages** (built and published by
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml)) and the API on
**Fly.io** (config in [`backend/fly.toml`](../backend/fly.toml)).

**SPA (already automated).** Each push to `main` touching `frontend/` builds the
React app with base path `/WeatherApplication/` (via `BASE_PATH`) and publishes it
to `https://<user>.github.io/WeatherApplication/`. Enable once: **Settings → Pages →
Source: GitHub Actions**.

**API on Fly.io** — from your machine, using the free `flyctl`:
```powershell
iwr https://fly.io/install.ps1 -useb | iex     # install flyctl
fly auth login                                  # free sign-up / sign-in
cd backend
fly launch --no-deploy --copy-config --name <your-unique-app>   # first time
fly secrets set MONGODB_URI="mongodb+srv://..."                 # optional (MongoDB Atlas)
fly deploy                                      # builds cloud/Dockerfile → https://<app>.fly.dev
```

**Wire them together:**
1. Add repo variable `API_BASE_URL = https://<app>.fly.dev`
   (**Settings → Secrets and variables → Actions → Variables**).
2. Re-run **Actions → deploy-spa-pages** so the SPA is rebuilt pointing at the API.
3. CORS is preset in `fly.toml` (`CORS_ALLOWED_ORIGINS`); if your Pages origin
   differs, update it and `fly deploy` again.

Fly's free tier auto-stops idle machines (`min_machines_running = 0`), so the first
request after a lull has a brief cold start.

## Files
| File | Purpose |
| ---- | ------- |
| `Dockerfile`, `backend/.dockerignore` | Build the API container (non-root, port 8080; context `backend/`) |
| `infra/*.tf` | Terraform: ECR, App Runner, S3, CloudFront, Route 53, ACM, CloudWatch |
| `../.github/workflows/deploy.yml` | CI/CD: test → build/push image → deploy API → sync SPA |
| `../jira-backlog.csv` | Importable backlog (Jira: **System → External System Import → CSV**) |

## One-time setup
1. **Terraform provision** (creates ECR before the API can deploy):
   ```bash
   cd cloud/infra
   terraform init
   terraform apply -var="spa_origin=https://YOUR_SPA_DOMAIN"      # or the CloudFront domain
   ```
   Note the outputs: `ecr_repository_url`, `api_url`, `spa_bucket`, `cloudfront_id`, `cloudfront_domain`.
2. **Seed the first image** (App Runner needs an image present):
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <ecr_registry>
   docker build -f cloud/Dockerfile -t <ecr_repository_url>:latest backend/
   docker push <ecr_repository_url>:latest
   ```
3. **GitHub OIDC role** + set repo **vars/secrets** listed at the top of `deploy.yml`
   (`AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, `APPRUNNER_SERVICE_ARN`,
   `SPA_BUCKET`, `CLOUDFRONT_ID`).
4. Point the SPA at the API: set the `API_BASE_URL` repo variable — CI injects it
   into `frontend/.env.production` (`VITE_API_BASE_URL`) at build time.
5. Provide the API a database: set `MONGODB_URI` (App Runner env / secret). Optional —
   without it the API serves the bundled in-memory country seed.

## Continuous deploy
Push to `main` → the workflow runs backend tests, frontend build+tests, builds &
pushes the image, triggers App Runner, syncs the SPA to S3, and invalidates
CloudFront.

## Go-live checklist
- [ ] API `/health` returns 200; App Runner health check green.
- [ ] **CORS**: `CORS_ALLOWED_ORIGINS` = the real SPA origin (set by Terraform `spa_origin`).
- [ ] `MONGODB_URI` set (Atlas/managed) if persistence is required; otherwise the seed fallback is in use.
- [ ] SPA `API_BASE_URL` points at the App Runner URL (not localhost).
- [ ] Custom domain: `domain_name` + `hosted_zone_id` set → ACM validated, Route 53 alias live.
- [ ] CloudWatch alarms on 5xx and p95 latency; log retention set.
- [ ] Autoscaling min 1 / max 3 (App Runner concurrency).
- [ ] Lighthouse/a11y pass.

## Optional scale/security add-ons
- **ElastiCache (Redis)** for a shared cache when running >1 instance.
- **WAF** on CloudFront for edge protection/rate-limiting.
- **Secrets Manager** if you later add keyed upstream APIs.

## Resource hygiene (local dev)
Stop dev servers before building; run one build at a time; delete stale
`backend/node_modules frontend/node_modules frontend/dist` when regenerating; stop preview
servers after verifying — keeps RAM low.
