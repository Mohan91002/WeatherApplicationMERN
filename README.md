# World Weather (MERN)

A full-stack weather dashboard that plots **253 countries and territories** as
live weather stations — each showing local time, temperature, sky conditions,
air quality, and a live currency exchange rate — over an **interactive world-map
backdrop** that pans and zooms to whichever station you hover.

Built on the **MERN stack** (MongoDB · Express · React · Node.js) as a deliberate
full-stack reference with one strict architectural rule: **all business logic
lives in the Node/Express backend; the React frontend is presentation-only.**

**🌐 Live demo:** <https://mohan91002.github.io/WeatherApplication/> — the SPA on
GitHub Pages. (Live weather needs the API deployed too — see [Deployment](#deployment).)

---

## What it does

- **Live weather + air quality** for every country (via Open-Meteo) — fetched,
  chunked, retried, merged, and cached server-side (1-hour shared cache).
- **Live currency exchange rates** (open.er-api.com), USD-based, cached.
- **Server-side classification** — WMO code → description, AQI → category,
  °C → °F — never in the client.
- **MongoDB-backed country dataset** — seeded on first run; the API reads it from
  Mongo (and falls back to a bundled seed if the database is unavailable).
- **Interactive world map** that pans/zooms to the hovered station.
- Sort (country / capital / AQI / year), search, favourites, India pinned first, infinite scroll.
- **Resilient by design** — if the backend can't reach the upstream APIs, the
  browser relays the raw responses back and the API *still* performs all
  merging / classification. The browser holds no domain logic.

---

## Stack & skills

| Area | Technologies |
| ---- | ------------ |
| Database | **MongoDB** (via **Mongoose**) — seeded country collection, graceful in-memory fallback |
| Backend | **Node.js** + **Express** (ES modules) — REST API, typed-JSDoc services, in-memory TTL cache, CORS, native `fetch` |
| Frontend | **React 18** + **TypeScript** + **Vite**, **SCSS**, React Context for shared map-focus state |
| Testing | **node:test** + **supertest** (API); **Vitest** + **Testing Library** (SPA) |
| Infrastructure as code | **HCL / Terraform** |
| Containerization | **Docker** (multi-stage, non-root) + **Docker Compose** |
| CI/CD | **YAML** — GitHub Actions with OIDC |

**Skills demonstrated:** REST API design · third-party API integration with
caching, retry & browser-relay fallback · MongoDB data modelling & seeding ·
responsive UI and interactive SVG data-visualization · unit + integration
testing · infrastructure-as-code · containerization · CI/CD with OIDC · AWS cloud
architecture · security hardening (locked CORS, private S3 + CloudFront OAC,
non-root container).

---

## Project structure

```
WeatherApplication/
├── backend/                  # Node.js + Express + MongoDB API — ALL business logic
│   ├── src/
│   │   ├── server.js              # host bootstrap: DB connect + listen
│   │   ├── app.js                 # Express app factory (also used by tests)
│   │   ├── config/db.js           # Mongo connection + country seeding + fallback
│   │   ├── models/Country.js      # Mongoose schema
│   │   ├── data/countries.js      # 253 countries/territories seed dataset
│   │   ├── routes/weatherRoutes.js# HTTP routes
│   │   ├── services/              # weather/FX integration, classification, cache
│   │   └── scripts/seed.js        # standalone (re-)seed script
│   ├── tests/                     # node:test unit + supertest integration tests
│   ├── .env.example
│   ├── Dockerfile-context (.dockerignore)
│   └── package.json
├── frontend/                 # React + TypeScript (Vite) SPA — presentation only
│   ├── src/
│   │   ├── main.tsx / App.tsx
│   │   ├── components/            # WorldMap, RegionsPanel, RegionCard (+ SCSS)
│   │   ├── api/weatherApi.ts      # API client + browser-relay fallback
│   │   ├── state/MapFocusContext.tsx
│   │   ├── shared/weatherVisuals.ts
│   │   ├── i18n/strings.ts
│   │   └── types/regionWeather.ts
│   ├── index.html · vite.config.ts · tsconfig.json
│   └── package.json
├── cloud/                    # deployment & infrastructure
│   ├── Dockerfile                 # API container (multi-stage, non-root; context = backend/)
│   ├── infra/                     # Terraform: ECR, App Runner, S3, CloudFront, Route 53, ACM, CloudWatch
│   ├── AWS_ARCHITECTURE.md        # AWS production topology
│   └── DEPLOY.md                  # deployment runbook
├── docker-compose.yml        # local MongoDB + API for one-command dev
├── ARCHITECTURE.md · DEPENDENCIES.md · PROJECT_PLAN.md · …
└── .github/workflows/        # CI/CD (deploy.yml, pages.yml)
```

---

## Backend responsibilities

Everything that isn't purely visual is server-side:

| Concern | Where |
| ------- | ----- |
| Country list + coordinates + currency + founding year | `backend/src/data/countries.js` → MongoDB → `GET /api/countries` |
| Live weather + air quality (fetch, chunk, retry, merge, cache) | `backend/src/services/regionWeatherService.js` → `GET /api/regions` |
| Live exchange rates (USD base, cached) | `backend/src/services/currencyRatesService.js` |
| WMO code → description, AQI → category, °C → °F | `backend/src/services/weatherClassifier.js` |
| Gradients, emoji, colours, layout, sorting, search, favourites, UI strings | `frontend/` (presentation only) |

### API endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET`  | `/health` | Liveness probe (App Runner / load-balancer health check) |
| `GET`  | `/api/countries` | The country dataset (MongoDB-backed) |
| `GET`  | `/api/regions` | Live weather + air quality + currency, merged server-side |
| `POST` | `/api/regions/merge` | Fallback: merges raw Open-Meteo + FX results relayed by the browser |

---

## Getting started

**Prerequisites:** Node.js 18.17+ / 20+ / 22+. MongoDB is **optional** for local
dev — without it the API runs on the bundled in-memory country seed. Full list in
[DEPENDENCIES.md](DEPENDENCIES.md).

### 1. Run the backend — http://localhost:5135
```bash
cd backend
npm install
cp .env.example .env   # optional: set MONGODB_URI, CORS_ALLOWED_ORIGINS, PORT
npm run dev            # or: npm start
```
CORS is pre-configured for the Vite dev server at `http://localhost:5173`.

### 2. Run the frontend — http://localhost:5173
```bash
cd frontend
npm install
npm run dev
```
Then open <http://localhost:5173>. Both servers must be running; if the API is
down the UI shows a friendly error.

### Optional: local MongoDB
Start a database (and the API) with Docker Compose:
```bash
docker compose up
```
Or point the API at any MongoDB by setting `MONGODB_URI` in `backend/.env`. The
country collection is seeded automatically on first connect (or run
`npm run seed` in `backend/` to force a refresh).

### Run the tests
```bash
# Backend — node:test unit + supertest integration tests
cd backend && npm test

# Frontend — Vitest + Testing Library
cd frontend && npm test
```

---

## Deployment

The API ships as a container (→ ECR → **AWS App Runner**) and the SPA as static
assets (**S3 + CloudFront**). Build the image from the repo root:

```bash
docker build -f cloud/Dockerfile -t weatherapplication-api backend/
```

**Free-host path (used by the live demo):** the SPA is published to **GitHub Pages**
via [`.github/workflows/pages.yml`](.github/workflows/pages.yml) and the API runs on
**Fly.io** ([`backend/fly.toml`](backend/fly.toml)) — steps in [cloud/DEPLOY.md](cloud/DEPLOY.md).
Provide a managed MongoDB (e.g. **MongoDB Atlas**) via the `MONGODB_URI` secret;
without it the deployed API still runs on the in-memory seed.

See [cloud/DEPLOY.md](cloud/DEPLOY.md) and [cloud/AWS_ARCHITECTURE.md](cloud/AWS_ARCHITECTURE.md)
for the full runbook and topology, or [ARCHITECTURE.md](ARCHITECTURE.md) for a
vendor-neutral (Docker Compose / Kubernetes) deployment.

---

## Documentation

| Doc | Covers |
| --- | ------ |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Toolchain + backend/frontend packages + external services |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Vendor-neutral architecture + diagram |
| [cloud/AWS_ARCHITECTURE.md](cloud/AWS_ARCHITECTURE.md) | AWS production topology + diagram |
| [cloud/DEPLOY.md](cloud/DEPLOY.md) | Deployment runbook + go-live checklist |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching / PR workflow |
| [PROJECT_PLAN.md](PROJECT_PLAN.md) | Scope, estimates, cost |
| [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) | End-to-end cost-optimization levers (build → run) |

---

## Contributing

This repo uses a **feature-branch workflow** — branch off `main`, open a pull
request, let CI run, then merge. Details in [CONTRIBUTING.md](CONTRIBUTING.md).
