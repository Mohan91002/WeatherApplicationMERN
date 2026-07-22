# World Weather — Architecture (vendor-neutral)

A cloud-agnostic view of the same deployable units described in
[AWS_ARCHITECTURE.md](cloud/AWS_ARCHITECTURE.md), but expressed **without any AWS
(or other proprietary) service** — only portable building blocks you can run on
a single VM, on-prem, in Docker Compose, or on Kubernetes.

- **React SPA** — static assets (`index.html`, hashed JS/CSS).
- **Node.js / Express API** — stateless container, owns *all* business logic.
- **MongoDB** — persistent store for the country dataset (seeded on first run;
  the API falls back to a bundled in-memory seed if it's unavailable).
- **Reverse proxy** — TLS, serves the SPA, proxies `/api/*` to the API.

The golden rule holds everywhere: **the browser carries no business logic**; it
only renders what the API returns (and, in the fallback path, relays raw upstream
responses back for the API to process).

---

## 1. High-level diagram

```mermaid
flowchart TB
    user["👤 User (browser)"]

    subgraph edge["Reverse proxy / ingress  (Nginx · Caddy · Traefik · HAProxy)"]
        proxy["TLS termination<br/>static SPA hosting<br/>/api/* → API<br/>gzip/brotli · SPA fallback to index.html"]
    end

    subgraph app["Application tier (containers)"]
        spa["React SPA<br/>(static Vite bundle)"]
        api["★ Node/Express API<br/>stateless · :8080<br/>/health probe<br/>in-memory cache (1h)"]
    end

    db[("MongoDB<br/>country dataset<br/>(seeded on first run)")]
    cache[("Shared cache (optional)<br/>Redis / Valkey<br/>— only when API replicas > 1")]

    subgraph upstream["External data (no API keys)"]
        meteo["Open-Meteo<br/>weather + air quality"]
        fx["open.er-api.com<br/>FX rates"]
        flags["flagcdn.com<br/>flag images"]
        fonts["Google Fonts<br/>web fonts"]
    end

    user -- HTTPS --> proxy
    proxy -- "/ (static)" --> spa
    proxy -- "/api/*" --> api
    api -- "countries" --> db
    api -. "outbound HTTPS" .-> meteo
    api -. "outbound HTTPS" .-> fx
    api <-. "optional" .-> cache
    user -. "fallback relay + flags/fonts" .-> flags
    user -. fonts .-> fonts

    classDef star fill:#1f6feb,stroke:#0b3d91,color:#fff;
    class api star;
```

**Fallback path:** if the API host can't reach Open-Meteo/FX, `GET /api/regions`
returns placeholder rows; the SPA detects this, fetches coordinates from
`/api/countries`, calls the upstreams from the browser, and POSTs the raw results
to `POST /api/regions/merge`. The API still performs *all* merge / classification.
In a normal deployment (API has egress) the fallback never fires.

---

## 2. Components (portable equivalents)

| Layer | Portable building block | Role | AWS equivalent (for reference) |
| ----- | ----------------------- | ---- | ------------------------------ |
| DNS | Any DNS provider | Domain → proxy | Route 53 |
| TLS | Let's Encrypt / internal CA | HTTPS certificates | ACM |
| Edge / static | **Nginx / Caddy / Traefik** | Serve SPA, proxy API, SPA-route to `index.html` | CloudFront + S3 |
| API compute | **Docker container** on VM / Compose / **Kubernetes** | Runs the Node/Express API, autoscale via replicas | App Runner |
| Database | **MongoDB** (self-hosted / Atlas) | Persistent country store | DocumentDB / Atlas |
| Image registry | Any OCI registry (Harbor, GHCR, GitLab, Docker Hub) | Stores the API image | ECR |
| CI/CD | Any runner (GitHub Actions, GitLab CI, Jenkins) | Test → build/push image → deploy → publish SPA | GitHub Actions + OIDC |
| Cache (opt.) | **Redis / Valkey** | Shared cache when replicas > 1 | ElastiCache |
| Monitoring | **Prometheus + Grafana + Loki** (or ELK) | Metrics, logs, dashboards, alerts | CloudWatch + SNS |
| Secrets | HashiCorp Vault / sealed secrets / env | `MONGODB_URI` and any keyed upstreams | Secrets Manager |
| WAF (opt.) | ModSecurity / Traefik middleware | Edge protection / rate-limit | AWS WAF |

---

## 3. Request flows

**A. First page load**
1. DNS resolves the domain → reverse proxy.
2. Proxy serves `index.html` + hashed JS/CSS (static bundle), with SPA fallback
   routing unknown paths to `index.html`.
3. React boots and calls the API.

**B. Live data**
1. SPA → `GET /api/regions` (same origin via the proxy, or a CORS-allowed origin).
2. API returns cached, merged data (weather + air + currency).
3. On cache miss the API loads countries from MongoDB, fetches Open-Meteo + FX,
   merges, and caches (1h).

**C. Fallback** (API host has no egress)
1. `GET /api/regions` returns placeholders → SPA detects no live data.
2. SPA fetches `/api/countries`, calls Open-Meteo + FX from the browser, POSTs raw
   results to `/api/regions/merge` → API merges/classifies.

**D. Deploy**
1. Push to `main` → CI runs backend tests + frontend build/tests.
2. Build the API image, push to the registry, roll the API deployment.
3. Build the SPA (injecting the API base URL), publish static assets behind the proxy.

---

## 4. Deployment topologies

### 4a. Single host — Docker Compose (simplest)
```
┌───────────────────────── Host / VM ─────────────────────────┐
│  reverse-proxy (Nginx/Caddy)  :443  ── TLS, static SPA, /api │
│        │ serves /dist                    │ proxy_pass         │
│        ▼                                  ▼                    │
│   [ SPA static files ]              [ api container :8080 ]   │
│                                     [ mongodb :27017 ]        │
│                                     [ redis :6379 (optional) ]│
└──────────────────────────────────────────────────────────────┘
```
The bundled [`docker-compose.yml`](docker-compose.yml) runs MongoDB + the API;
put a proxy in front and serve the built SPA from a static folder. Good for
demos, small prod, on-prem.

### 4b. Kubernetes (scale / HA)
- **Ingress controller** (Nginx/Traefik) + **cert-manager** for TLS.
- **API** as a `Deployment` (N replicas) + `Service`, `readiness`/`liveness` on `/health`,
  scaled by an `HorizontalPodAutoscaler`.
- **MongoDB** as a managed service (Atlas) or a `StatefulSet` with persistent volumes.
- **SPA** served either by the ingress from a static volume/CDN or a tiny Nginx pod.
- **Redis/Valkey** `StatefulSet` (or managed) as the shared cache so replicas stay
  within upstream rate limits.
- **Prometheus/Grafana/Loki** for observability.

---

## 5. Configuration (environment variables)

| Variable | Purpose |
| -------- | ------- |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of the real SPA origin(s) (not `*`). Behind a same-origin proxy this can be the public URL. |
| `MONGODB_URI` | MongoDB connection string. Unset/unreachable → the API runs on the bundled in-memory country seed. |
| `PORT` | Port the API listens on (`8080` in the container, `5135` in local dev). |
| SPA `VITE_API_BASE_URL` (build-time) | Point the SPA at the API. With a same-origin proxy, use a relative `/api` (empty string). Injected into `.env.production` at build time (see the CI workflows). |

---

## 6. Security
- **TLS everywhere** — proxy terminates HTTPS.
- **Same-origin or locked CORS** — `CORS_ALLOWED_ORIGINS`, never `*`.
- **Container runs as non-root** on port 8080 (see `cloud/Dockerfile`).
- **Secrets stay server-side** — `MONGODB_URI` (and any future keyed upstreams) via
  Vault/sealed secrets / a secrets manager, never in the client.
- **Optional edge protection** — ModSecurity/Traefik middleware for rate-limiting.
- **Image scanning** in CI before push.

## 7. Scaling & availability
- **SPA is static** → trivially cacheable/replicable; put a CDN in front if desired.
- **API is stateless** (only an in-memory 1h cache) → scale horizontally with replicas.
- **MongoDB** provides the shared source of truth for the country data across replicas.
- With **> 1 replica**, add **Redis/Valkey** as a shared cache so all instances share
  weather/FX results and stay within Open-Meteo/FX rate limits.
- Health checks (`/health`) + rolling deploys give zero-downtime updates.

## 8. Local development
```bash
# Terminal 1 — API (http://localhost:5135)
cd backend && npm install && npm run dev

# Terminal 2 — SPA (http://localhost:5173; CORS pre-allowed for :5173)
cd frontend && npm install && npm run dev

# Optional — a local MongoDB
docker compose up mongo
```
See [DEPENDENCIES.md](DEPENDENCIES.md) for the full toolchain and package list.
