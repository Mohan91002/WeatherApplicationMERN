# Dependencies & Requirements — World Weather (MERN)

Everything needed to build and run the two units: the **Node.js/Express API**
(backend, MongoDB-backed) and the **React + TypeScript (Vite) SPA** (frontend).
Extracted from `backend/package.json` and `frontend/package.json`.

---

## 1. Toolchain / prerequisites

| Tool | Required | Verified in this environment | Notes |
| ---- | -------- | ---------------------------- | ----- |
| **Node.js** | 18.17+ / 20+ / 22+ | `v24.12.0` ✅ | Runs both the API and the Vite toolchain. Node 24 works fine. |
| **npm** | bundled with Node | `11.18.0` ✅ | Installs deps and runs the scripts. |
| **MongoDB** | 6+ *(optional for local dev)* | **not installed** ⚠️ | The API degrades gracefully to a bundled in-memory seed when absent. Use MongoDB Atlas or `docker compose up mongo` for persistence. |
| **Docker** | *(deploy / optional local Mongo)* | — | For the container image (`cloud/Dockerfile`) and `docker-compose.yml`. |

> The API needs no database to boot: if `MONGODB_URI` is unset or unreachable it
> serves the 253-country dataset from `backend/src/data/countries.js`.

---

## 2. Backend — Node.js / Express (npm, `backend/package.json`)

Runs on ES modules; type `"module"`. No build step — executed directly with Node.

### Runtime dependencies
| Package | Version | Purpose |
| ------- | ------- | ------- |
| `express` | `^4.21.2` | HTTP server, routing, JSON body parsing. |
| `cors` | `^2.8.5` | CORS allow-list for the SPA origin(s). |
| `mongoose` | `^8.9.5` | MongoDB ODM — country schema, seeding, queries. |

Uses Node's built-in global `fetch` (Open-Meteo / FX calls), `AbortSignal.timeout`
(request timeouts), and a small hand-rolled TTL cache — no extra packages needed.

### Dev dependencies
| Package | Version | Purpose |
| ------- | ------- | ------- |
| `supertest` | `^7.0.0` | Drives the Express app in-memory for endpoint tests. |

Tests run on Node's built-in test runner (`node --test`) — no Jest/Mocha needed.

### Install / run / test
```bash
cd backend
npm install
npm run dev     # node --watch src/server.js  → http://localhost:5135
npm start       # node src/server.js
npm test        # node --test
npm run seed    # force a MongoDB re-seed from the bundled dataset
```

---

## 3. Frontend — React + TypeScript (Vite, `frontend/package.json`)

### Runtime dependencies
| Package | Version | Purpose |
| ------- | ------- | ------- |
| `react`, `react-dom` | `^18.3.1` | React 18 UI runtime. |

### Dev dependencies
| Package | Version | Purpose |
| ------- | ------- | ------- |
| `vite`, `@vitejs/plugin-react` | `^5.4` / `^4.3` | Dev server + production bundler. |
| `typescript` | `~5.6.3` | Compiler / type-checker. |
| `sass` | `^1.83.0` | Compiles the component `.scss` styles. |
| `vitest`, `jsdom` | `^2.1` / `^25` | Unit-test runner + DOM environment. |
| `@testing-library/react`, `@testing-library/jest-dom` | `^16` / `^6` | Component testing utilities. |
| `@types/react`, `@types/react-dom` | `^18.3` | React type definitions. |

### Install / build / run / test
```bash
cd frontend
npm install
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # type-check + production build → frontend/dist/
npm test          # vitest run
```

The API base URL is read from `VITE_API_BASE_URL` (`.env` for dev,
`.env.production` for builds; empty = same origin).

---

## 4. External runtime services (no API keys)

The **backend** calls these directly (results cached in-memory for 1 hour); on
egress failure the **browser** relays them and the backend still does all merging.

| Service | Host | Used for |
| ------- | ---- | -------- |
| Open-Meteo | `api.open-meteo.com` / `air-quality-api.open-meteo.com` | Live weather + air quality. |
| Exchange Rate API | `open.er-api.com` | Live USD-based FX rates. |
| flagcdn | `flagcdn.com` | Flag images (fetched by the browser). |
| Google Fonts | `fonts.googleapis.com` / `fonts.gstatic.com` | UI web fonts (frontend). |

> No secrets/keys are required. A managed MongoDB (e.g. MongoDB Atlas) connection
> string is the only optional secret — store it as `MONGODB_URI` in a secrets
> manager (see the deployment docs), never in the client.

---

## 5. Deployment-only dependencies

| Dependency | Where | Purpose |
| ---------- | ----- | ------- |
| Docker | `cloud/Dockerfile`, `backend/.dockerignore`, `docker-compose.yml` | Multi-stage API container (non-root, port 8080; build context `backend/`) + local Mongo stack. |
| Terraform | `cloud/infra/*.tf` | Infrastructure-as-code (AWS topology). |
| MongoDB Atlas *(or self-hosted Mongo)* | runtime `MONGODB_URI` | Persistent country store in production. |

See [ARCHITECTURE.md](ARCHITECTURE.md) (vendor-neutral) and
[cloud/AWS_ARCHITECTURE.md](cloud/AWS_ARCHITECTURE.md) (AWS) for how these fit together.
