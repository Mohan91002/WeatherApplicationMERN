# WeatherApplication — Delivery, Estimation & Deployment Plan

A single reference covering **what was built**, the **skills/architecture**, a
**traditional Scrum estimate** (hours, team, sprints, Jira tickets, cost), the
**AI‑assisted approach** (prompt‑by‑prompt), **AWS deployment** (services +
monthly cost), and a **go‑live plan**.

> All figures are planning estimates for a production‑grade rebuild of this app.
> Currency in USD; rates vary by region — swap in your own blended rate.

---

## 1. What was actually built (scope baseline)

| Area | Detail |
| ---- | ------ |
| Backend | Node.js/Express API: endpoints `/health`, `/api/countries`, `/api/regions`, `POST /api/regions/merge` |
| Backend services | `weatherClassifier`, `currencyRatesService`, `regionWeatherService`; in‑memory TTL cache; native `fetch` |
| Database | MongoDB (Mongoose) — country collection seeded on first run, in‑memory seed fallback |
| Data | 253 countries + India union territories (name, capital, flag, coords, currency, founding year, official language) |
| Integrations | Open‑Meteo (weather + air quality), open.er‑api (FX), flagcdn (flags), Wikidata + Natural Earth + mledoze (build‑time data) |
| Frontend | React 18 + TypeScript (Vite) SPA (English‑only): station cards, world‑extremes header, interactive world‑map backdrop |
| Frontend features | Sort (country/capital/AQI/year), search, favourites, infinite scroll + scroll‑up unload, currency, timezone (IST · UTC+5:30), founding year, official language |
| Tests | Backend node:test/supertest, Frontend Vitest + Testing Library |

---

## 2. Skills & technology used

**Backend**
- **Node.js** + **Express** (ES modules), native global `fetch`
- **MongoDB** + **Mongoose** (country schema, seeding, graceful fallback)
- In‑memory TTL cache; typed‑JSDoc services
- Resilience: retry, graceful fallback, chunking
- Testing: **node:test** + **supertest** integration tests

**Frontend**
- TypeScript, **React 18** (function components + hooks), **Vite**
- Hooks (`useState`, `useMemo`, `useEffect`, `useRef`), React Context for shared map‑focus state
- `fetch` + async/await (`Promise.all`, retry, cache)
- SCSS design system, responsive layout, accessibility (focus rings, reduced‑motion)
- `Intl` API (locale number/time)
- SVG data‑viz (equirectangular map projection), interactive pan/zoom on card hover
- Testing: **Vitest + Testing Library**

**Data engineering / tooling**
- Node.js ETL scripts, GeoJSON, **Wikidata SPARQL**, orthographic/equirectangular projection math
- Git, Vite, Node, npm

**Design**
- Distinctive visual direction (a weather‑station board), typography pairing, motion, colour systems

---

## 3. Architecture

```
                        ┌──────────────────────────────────────────┐
                        │                 Browser                   │
                        │   React 18 + TS SPA (static Vite assets)  │
                        │   • station cards, world map               │
                        └───────────────┬───────────────────────────┘
                                        │ HTTPS (REST)
                                        ▼
                        ┌──────────────────────────────────────────┐
                        │     Node/Express API (+ MongoDB)           │
                        │  /health           /api/countries          │
                        │  /api/regions      /api/regions/merge      │
                        │                                            │
                        │  RegionWeatherService ── in‑memory cache   │
                        │  WeatherClassifier                         │
                        │  CurrencyRatesService                      │
                        └───────┬───────────────────────┬───────────┘
                                │ (primary path)         │
                                ▼                        ▼
                     Open‑Meteo (weather,      open.er‑api (FX rates)
                     air quality)              flagcdn (flag images, browser)

  Fallback: if the API host can't reach upstream, the browser relays raw
  Open‑Meteo + FX data to POST /api/regions/merge — backend still does all
  merging / classification (no business logic in the client).
```

**Deployment topology (AWS):** SPA on S3 + CloudFront; API as a container on
App Runner (or ECS Fargate + ALB); Route 53 DNS; ACM TLS; CloudWatch logs;
optional ElastiCache for shared cache when running >1 instance.

---

## 4. Traditional delivery plan (Scrum)

### 4.1 Team (≈ 3.5–4 FTE)

| Role | Allocation |
| ---- | ---------- |
| Product Owner | 0.25 |
| Scrum Master | 0.25 |
| Backend engineer (Node.js) | 1.0 |
| Frontend engineer (React) | 1.0 |
| QA engineer | 0.5 |
| DevOps / Cloud | 0.5 |
| UX / Designer | 0.5 |

### 4.2 Effort by epic (person‑hours)

| # | Epic | Hours |
| - | ---- | ----- |
| E1 | Backend foundation + weather API | 40 |
| E2 | Currency + founding‑year data | 24 |
| E3 | Frontend design system + components + interactive map | 94 |
| E4 | Testing (unit, integration, QA, a11y) | 68 |
| E5 | DevOps / AWS / CI‑CD | 48 |
| E6 | PM, ceremonies, UX, buffer | 94 |
| | **Total** | **≈ 368 h** |

### 4.3 Sprints

- **Cadence:** 2‑week sprints.
- **Velocity:** ~90 productive dev‑hours/sprint (small team).
- **Duration:** ≈ **4 sprints (~8 weeks / 2 months)** to production.

| Sprint | Focus | Stories | Points |
| ------ | ----- | :-----: | :----: |
| Sprint 1 | Backend core (API, dataset, classifier, Open-Meteo, relay, MongoDB) + React scaffold + UX design | 7 | 35 |
| Sprint 2 | Data enrichment (FX, currency, year, language) + design system, station card, regions panel | 7 | 31 |
| Sprint 3 | Interactive map, infinite scroll, responsive + backend/frontend tests + Dockerize + CORS config | 7 | 32 |
| Sprint 4 | CI/CD, AWS Terraform, observability + manual QA/a11y + hardening buffer | 5 | 34 |

Ceremonies + backlog grooming (5 pts) run across all four sprints — **27 stories / 137 points** total.

### 4.4 Jira ticket breakdown (≈ 134 issues total)

Importable backlog: [`jira-backlog.csv`](jira-backlog.csv)
— Epics + Stories + Sub‑tasks + Spikes with Sprint, Story Points and parent links.

| Type | Count |
| ---- | ----- |
| Epics | 6 |
| Stories | 27 |
| Sub‑tasks | 78 |
| Spikes | 5 |
| Bugs (expected) | ~15–20 |
| **Total (pre‑created)** | **116** |

Sample epic → story map:

- **FRONTEND** → stories: design system, station card, regions panel,
  sort/search/favourites, infinite scroll + unload, world map,
  timezone + responsive grid → each 2–4 sub‑tasks (component, styles, spec, review).

### 4.5 Cost (build)

| Blended rate | 368 h build | + 25 % PM/QA overhead |
| ------------ | ----------- | --------------------- |
| $40/h (offshore) | $14,720 | ~$18,400 |
| $75/h (blended) | $27,600 | ~$34,500 |
| $120/h (onshore) | $44,160 | ~$55,200 |

> **Rule of thumb:** ~**$18k–$55k** one‑time build depending on region/seniority.

---

## 5. AI‑assisted delivery (what actually happened here)

This app was built conversationally with an AI agent + one human reviewer.

| Metric | Traditional | AI‑assisted (this project) |
| ------ | ----------- | -------------------------- |
| Elapsed time | ~8 weeks | ~1 working session (hours) |
| People | 3.5–4 FTE | 1 human (review/direction) + agent |
| Effort | ~368 h | ~15–20 human prompts + review |
| Build cost | $20k–$60k | LLM usage ≈ **$20–$80** + reviewer time |
| Tests written | manual | 31 automated tests (18 backend + 13 frontend) generated + run |

**Prompts used in this session (high‑level):** ~15 substantive prompts
(backend split, live currency, world map, run/verify, official languages, rename +
territories, borders/flag‑fill, revert). Net **~10–15 feature prompts**.

> AI‑assisted is ~**10–20× faster** and ~**100–1000× cheaper on labour** for a
> build of this size, **provided** a human reviews architecture, correctness,
> and security before go‑live. It does **not** remove the need for
> QA, a11y, and production hardening.

---

## 6. Step‑by‑step prompt playbook (build → deploy)

Give these to an AI coding agent, one at a time. **Resource hygiene** is baked
in (stop servers before builds; one build at a time; clear caches) to keep RAM
low.

### Phase A — Backend
1. `Create a .NET 10 minimal API project "WeatherApplication" with a GET /health check, CORS for http://localhost:4200, and OpenAPI. Keep all business logic server-side.`
2. `Add a Countries dataset (name, capital, ISO code, flag, lat/lon) as backend data served at GET /api/countries. Generate it from the mledoze/countries dataset.`
3. `Add WeatherClassifier: WMO code → description, US AQI → category, °C → °F, with unit tests.`
4. `Add RegionWeatherService that fetches live weather + air quality from Open-Meteo (chunked, retry once, merge) with an in-memory 1h cache; expose GET /api/regions. Add a POST /api/regions/merge browser-relay fallback.`
5. `Enrich the dataset with currency (code + symbol), founding year (Wikidata inception), and official language. Add a live FX service (open.er-api.com, cached) and include currency + rate in /api/regions.`
6. `Add an xUnit test project (WeatherApplication.Tests): classifier boundaries, merge, and WebApplicationFactory endpoint tests. Run "dotnet test".`

### Phase B — Frontend
7. `Scaffold an Angular 18 standalone SPA in /frontend that calls the .NET API; presentation-only, no business logic. Use signals.`
8. `Design a distinctive weather-station UI: design tokens, type pairing, station-model cards (flag, capital, country, local time, official language, temp/air/currency), a live world-extremes header.`
9. `Add sort (country/capital/AQI/year), search, favourites (localStorage), and infinite scroll that loads 5 more near the bottom and unloads 5 when scrolling back up.`
10. `Add an interactive world-map backdrop (equirectangular SVG) that pans/zooms to the hovered card; a MapFocusService shares the hovered location.`
11. `Add timezone label (IST · UTC+5:30 style) and founding year to each card; keep every card the same size and responsive (5→3→2→1 columns).`
12. `Add Karma/Jasmine specs for the weather service (primary + fallback), the UI visuals helpers, region card, regions panel, and world map. Run headless with a hardened Chrome launcher (--no-sandbox, longer timeouts).`

### Phase C — Deploy (AWS)
13. `Add a multi-stage Dockerfile for the .NET API (publish trimmed, non-root, expose 8080) and a .dockerignore.`
14. `Add GitHub Actions: build+test backend, build+test frontend, build+push image to ECR, deploy API to App Runner, sync SPA to S3 + invalidate CloudFront.`
15. `Provision AWS with Terraform: ECR, App Runner service (or ECS Fargate + ALB), S3 static site, CloudFront (OAC), Route 53 record, ACM cert, CloudWatch log group.`
16. `Add health checks (/health), structured logging, and a CloudWatch dashboard (latency, 5xx, cache hit rate). Configure autoscaling min 1 / max 3.`

> **RAM hygiene note for the agent:** *"Before any build or test, stop running
> dev servers; run only one build at a time; after verifying, stop preview
> servers; delete stale bin/obj and dist artifacts when regenerating."*

---

## 7. AWS deployment — services & monthly cost

### 7.1 Services

| Service | Purpose |
| ------- | ------- |
| **S3** | Host the React (Vite) static bundle |
| **CloudFront** | CDN + HTTPS for the SPA |
| **ECR** | Store the API container image |
| **App Runner** *(simple)* or **ECS Fargate + ALB** *(scalable)* | Run the Node/Express API container |
| **Route 53** | DNS |
| **ACM** | TLS certificates (free) |
| **CloudWatch** | Logs, metrics, dashboard, alarms |
| **ElastiCache (Redis)** *(optional)* | Shared cache when >1 API instance |
| **Secrets Manager / SSM** *(optional)* | Config/keys (APIs here are keyless) |
| **WAF** *(optional)* | Edge protection |

### 7.2 Monthly cost (us‑east‑1, low traffic)

| Item | Minimal | Scalable |
| ---- | ------- | -------- |
| API compute | App Runner ~$25 | Fargate 2× + ALB ~$55 |
| S3 + CloudFront | ~$3 | ~$8 |
| Route 53 | ~$1.5 | ~$2 |
| CloudWatch | ~$3 | ~$12 |
| ElastiCache | — | ~$12 |
| ECR/Secrets/misc | ~$2 | ~$5 |
| **Total / month** | **≈ $35–60** | **≈ $90–130** |

> First 12 months: AWS Free Tier reduces this materially. Traffic‑driven costs
> (CloudFront egress, requests) scale with usage.

### 7.3 Visual dashboard + human intervention

| Option | Cost |
| ------ | ---- |
| CloudWatch Dashboard | ~$3 / dashboard / month |
| Amazon Managed Grafana | ~$9 / editor + $5 / viewer / month |
| Human monitoring (0.1 FTE SRE / on‑call) | ~$1,500–3,000 / month (region‑dependent) |

For a small app, a **CloudWatch dashboard (~$3/mo) + light on‑call** is enough.

> **Cutting costs further?** See [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) for
> end-to-end levers — serverless/right-sizing, free tiers, caching, budget guardrails.

---

## 8. Go‑live plan (traditional vs AI‑utilized)

| Milestone | Traditional | AI‑utilized |
| --------- | ----------- | ----------- |
| Build complete | Week 6 | Session 1 |
| Test + QA sign‑off | Week 7 | + review pass |
| Staging deploy | Week 7 | same day |
| UAT + a11y review | Week 8 | 1–2 days (human) |
| Production go‑live | End Week 8 | Week 1 |
| Run cost | ~$35–130/mo AWS + support | same AWS + minimal support |

**Go‑live checklist:** health checks green · autoscaling set · HTTPS + custom
domain · CloudWatch alarms (5xx, latency, cache) · logs retained · CORS locked
to the SPA origin · rate‑limit/WAF · rollback plan · Lighthouse/a11y pass.

---

## 9. Summary numbers (at a glance)

| Question | Answer |
| -------- | ------ |
| Effort (traditional) | **~368 person‑hours** |
| Team | **~3.5–4 FTE** (BE, FE, QA, DevOps, UX, PO/SM) |
| Sprints | **4 × 2‑week (~2 months)** |
| Jira issues | **~134** (6 epics, 27 stories, 78 sub‑tasks, ~18 bugs, 5 spikes) |
| Build cost | **~$20k–$60k** (rate‑dependent) |
| AI prompts | **~15 feature prompts** in one session |
| AI build cost | **~$20–$80** LLM usage + reviewer time |
| AWS run cost | **~$35–60/mo** (minimal) → **~$90–130/mo** (scalable) |
| Dashboard | CloudWatch **~$3/mo** (+ human on‑call if needed) |
```
