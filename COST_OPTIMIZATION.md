# Cost Optimization — End to End

How to **build and run WeatherApplication for the least money** across the whole
lifecycle: **build → deploy → run → operate**. Figures are USD, low-traffic.
Baselines come from [PROJECT_PLAN.md](PROJECT_PLAN.md) §4.5 (build) and §7 (AWS run).

---

## TL;DR — the biggest levers

| Lever | Typical saving | Section |
| ----- | -------------- | ------- |
| AI-assisted build instead of a full team | **~$18k–55k → ~$20–80** | [1](#1-build-phase-cost) |
| Keyless APIs + open data + OSS (no licences) | **$0 data/licence cost** | [1](#1-build-phase-cost) |
| Server-side 1-hour shared cache | fewer upstream calls → stays in free tiers | [2](#2-design-choices-that-keep-run-cost-low) |
| Static SPA (S3 + CloudFront), no front-end server | cheapest hosting tier | [2](#2-design-choices-that-keep-run-cost-low) |
| Drop ElastiCache + WAF at low scale | **~$15–25/mo** | [3](#3-aws-run-cost-optimization) |
| Serverless / right-sized compute + Free Tier | **API ~$25 → ~$0–10/mo** | [3](#3-aws-run-cost-optimization) |
| Near-zero portfolio hosting | **~$0–5/mo total** | [5](#5-near-zero-deployment-portfoliodemo) |

---

## Decision flow — cheapest hosting by traffic

```mermaid
flowchart TD
    A(["Deploying WeatherApplication"]) --> B{"Production or<br/>portfolio / demo?"}

    B -->|"Portfolio / demo"| C["SPA: Cloudflare / GitHub Pages<br/>API: Lambda or Fly.io free tier"]
    C --> C1(["~$0–5 / mo"])

    B -->|"Production"| D{"Traffic level?"}

    D -->|"Low / flat"| E["SPA: S3 + CloudFront free tier<br/>API: App Runner min 0.25 vCPU / 0.5 GB<br/>no ElastiCache, no WAF<br/>logs 7–14 days"]
    E --> E1(["~$15–30 / mo"])

    D -->|"Spiky / unpredictable"| F["SPA: S3 + CloudFront<br/>API: Lambda + API Gateway<br/>or Fargate Spot, pay-per-use"]
    F --> F1(["~$5–20 / mo, scales to zero"])

    D -->|"Steady / high"| G["SPA: S3 + CloudFront + WAF<br/>API: App Runner or Fargate 2–3x<br/>ElastiCache shared cache<br/>Compute Savings Plan"]
    G --> G1(["~$90–130 / mo"])

    C1 --> H{{"Always on: AWS Budgets + anomaly alerts,<br/>cost tags, egress alarm, Free Tier for 12 months"}}
    E1 --> H
    F1 --> H
    G1 --> H
```

> Same app, four price points. The design (static SPA + small stateless API +
> keyless upstreams + 1-hour cache) lets you slide down this tree without code
> changes — only the hosting target differs.

---

## 1. Build-phase cost

- **AI-assisted delivery is the dominant lever.** ~$20–80 of LLM usage + review vs
  ~$18k–55k for a 3.5–4 FTE team over ~2 months (PROJECT_PLAN §4.5, §5). ~10–20×
  faster, ~100–1000× cheaper on labour — *provided a human reviews architecture,
  correctness and security.*
- **Zero-cost inputs.** Every external dependency is free:
  - APIs are **keyless** — Open-Meteo (weather/air), open.er-api (FX), flagcdn (flags).
  - Data is **open** — mledoze/countries, Wikidata (SPARQL), Natural Earth.
  - Frameworks are **OSS** — Node.js, Express, React, MongoDB. No licences.
- **Scope discipline.** Cut features that don't earn their keep — the 7-language
  i18n stack and the 7-day outlook were removed. Less code = less build, less test,
  less run, less maintenance.
- **One repo + one CI pipeline** for both apps — no per-service tooling spend.

---

## 2. Design choices that keep run-cost low

These are already in the app — they cut cost *by architecture*, before any tuning:

| Choice | Cost effect |
| ------ | ----------- |
| **1-hour shared server-side cache** | Collapses N users into ~1 upstream fetch/hour → stays inside free API limits, minimizes API compute. |
| **Chunked upstream calls + retry-once** | Fewer requests, no runaway retry storms. |
| **Browser-relay fallback** | The browser fetches upstream when the API host can't → **no paid NAT gateway / egress proxy** just to reach the internet. |
| **Static SPA on S3 + CloudFront** | No front-end server to run — the cheapest possible hosting. |
| **Stateless API + in-memory cache** | Run a single tiny instance; **no database, no Redis** at low scale. |
| **Trimmed, non-root, multi-stage image** | Small image → cheaper ECR storage, faster cold starts, less compute. |
| **All logic server-side, keyless upstreams** | No client secrets, no Secrets Manager, no per-key billing. |

---

## 3. AWS run-cost optimization

**Compute (API)**
- Right-size **App Runner** to the smallest size (0.25 vCPU / 0.5 GB); autoscale
  **min 1 / max 2–3**. Pause the service when idle in non-prod.
- For low or spiky traffic, consider **Lambda + API Gateway** or **Fargate Spot** —
  pay-per-use can drop compute to ~$0–10/mo.
- Use **Compute Savings Plans** for steady-state (~30–40% off on-demand).

**Front end (S3 + CloudFront)**
- Long, immutable `Cache-Control` on hashed bundles (1 yr); short TTL on `index.html`.
- Enable **Brotli/gzip** compression and HTTP/2–3.
- Lean on the **CloudFront free tier** (1 TB egress + 10M requests/mo, first 12 mo);
  use **price class 100** (NA/EU) if you don't need every edge location.
- S3 **Intelligent-Tiering** + lifecycle rules; keep the bucket private behind **OAC**.

**Data / cache**
- **Skip ElastiCache** until you actually run >1 instance — the in-memory cache is
  enough for a single instance (**~$12/mo saved**).
- **Skip WAF** unless you need edge rate-limiting/protection (**~$5–10/mo saved**).
- Keyless APIs → **no Secrets Manager** needed.

**Observability**
- Set CloudWatch **log retention to 7–14 days** (not "never expire" — the usual
  silent cost). One **CloudWatch dashboard (~$3/mo)**, not managed Grafana.
- Alarm only on what matters: 5xx rate, p95 latency, and **a cost/egress alarm**.

**DNS / TLS / images**
- **ACM certs are free**; Route 53 ~$0.50/hosted zone + query cost.
- **ECR lifecycle policy** to expire untagged/old images.
- Deploy SPA **and** API in the **same, cheapest region** (us-east-1) to avoid
  cross-region data-transfer charges.

---

## 4. CI/CD cost

- **GitHub Actions free tier** (public repos: unlimited; private: 2,000 min/mo).
- **Cache** npm + NuGet; run tests only on PR/`main`; use **path filters** and
  **concurrency cancellation** to kill superseded runs.
- Build the image **once** with multi-stage + layer caching; reuse across deploy.
- **OIDC** (already planned) → no long-lived cloud secrets to store/rotate.

---

## 5. Near-zero deployment (portfolio / demo)

If this is a showcase rather than production, you can run it for roughly **$0–5/mo**:

| Piece | Free / cheap option |
| ----- | ------------------- |
| SPA | **Cloudflare Pages** or **GitHub Pages** (free), or S3+CloudFront free tier |
| API | **Fly.io / Render / Railway** free-ish tier, or **AWS Lambda** free tier (1M req/mo) |
| DNS/TLS | Cloudflare (free) or ACM + Route 53 (~$0.50/mo) |

The app is already suited to this: static SPA + a small stateless container + keyless
APIs + 1-hour cache means almost no compute and almost no egress.

---

## 6. Guardrails (don't get surprised)

- **AWS Budgets** + **Cost Anomaly Detection** with email/SNS alerts from day one.
- **Cost allocation tags** on every resource; review in **Cost Explorer** weekly.
- Delete idle/orphaned resources (unattached EIPs, old snapshots, stale images).
- Watch **data transfer / CloudFront egress** — it's the most common surprise line.

---

## Cost summary — baseline vs optimized

**Build (one-time)**

| Path | Cost |
| ---- | ---- |
| Traditional team | ~$18k–55k |
| **AI-assisted (this project)** | **~$20–80** LLM + reviewer time |

**Run (per month, low traffic)**

| Scenario | Monthly | What changed |
| -------- | ------- | ------------ |
| **Portfolio / near-zero** | **~$0–5** | Cloudflare/GitHub Pages + Lambda/Fly free tiers |
| **AWS minimal (optimized)** | **~$15–30** | App Runner min size, no ElastiCache/WAF, free-tier CDN, short log retention |
| AWS minimal (baseline, §7) | ~$35–60 | as documented in PROJECT_PLAN |
| AWS scalable | ~$90–130 | multi-instance + ElastiCache + WAF |

> First 12 months, the **AWS Free Tier** reduces the optimized figures further —
> often to single digits for a low-traffic deployment.
