# World Weather — Feature & Modification Roadmap

What can be **modified or added** on top of the current MERN build, grouped by
area and ranked by effort/impact. Every item is grounded in the code that exists
today — file references point at the extension point.

> **Baseline (verified):** the app is green. `cd backend && npm test` → 18 pass,
> `cd frontend && npm test` → 13 pass (31 total). No open issues/PRs. The four
> endpoints (`/health`, `/api/countries`, `/api/regions`, `POST /api/regions/merge`)
> work, and the SPA renders the 253-station board with the interactive map.

---

## 1. Where the seams are (extension points)

| Area | File | What it owns |
| ---- | ---- | ------------ |
| HTTP surface | `backend/src/routes/weatherRoutes.js` | Every route — add new endpoints here |
| Weather integration | `backend/src/services/regionWeatherService.js` | Open-Meteo fetch / merge / classify |
| Classification | `backend/src/services/weatherClassifier.js` | WMO code → text, AQI → category, °C → °F |
| FX | `backend/src/services/currencyRatesService.js` | USD-based rates, 1 h cache |
| Cache | `backend/src/services/cache.js` | In-memory TTL cache |
| Dataset | `backend/src/data/countries.js` + `models/Country.js` | 253 countries, Mongo seed |
| SPA shell | `frontend/src/App.tsx`, `components/RegionsPanel.tsx` | Board, sort/search/infinite scroll |
| Card | `frontend/src/components/RegionCard.tsx` | One station model |
| Map | `frontend/src/components/WorldMap.tsx` | Equirectangular pan/zoom backdrop |
| Visuals / i18n | `frontend/src/shared/weatherVisuals.ts`, `i18n/strings.ts` | Colours, icons, labels |

---

## 2. Backend / API features

| # | Feature | Why / evidence | Effort |
| - | ------- | -------------- | ------ |
| B1 | **Per-country detail endpoint** `GET /api/regions/:code` | Only the whole-world list exists; a single-country lookup enables a detail page/modal without shipping 253 rows | S |
| B2 | **Richer current metrics** — humidity, wind, precipitation, pressure, sunrise/sunset, UV | `fetchChunk` requests only `temperature_2m,weather_code`; Open-Meteo returns all of these in the same call | S |
| B3 | **Forecast (hourly / 7-day)** | Explicitly removed for cost (`COST_OPTIMIZATION.md` §1); re-add as an opt-in endpoint so the base board stays cheap | M |
| B4 | **HTTP caching + ETag / `Cache-Control`** on `/api/regions` | The 1 h freshness lives only in the in-memory cache; no conditional-request support for the SPA/CDN | S |
| B5 | **Rate limiting + request-schema validation** on `POST /api/regions/merge` | Body is accepted up to `5mb` with no validation (`app.js`); add a guard to prevent abuse | S |
| B6 | **Richer `/health`** — DB state + cache stats + uptime | Currently returns a static `{status:'healthy'}`; `dbState` already exists to report | S |
| B7 | **Structured logging / request IDs** | Only `console.warn/error` today; needed for the CloudWatch alarms the infra expects | S |
| B8 | **OpenAPI / Swagger docs** | Jira backlog referenced OpenAPI; no schema is published now | S |
| B9 | **Shared cache (Redis/Valkey)** behind `cache.js` | Only needed when API replicas > 1 (`ARCHITECTURE.md` §7); the interface is already isolated | M |
| B10 | **API versioning** (`/api/v1/...`) | Single unversioned surface; cheap to add before the API grows | S |

---

## 3. Frontend / UX features

| # | Feature | Why / evidence | Effort |
| - | ------- | -------------- | ------ |
| F1 | **Country detail modal/page** | Cards are read-only; pairs with B1/B2 for forecast + extra metrics | M |
| F2 | **Unit toggle (°C/°F) persisted** | Card always shows both; a preference is a small, high-visibility win | S |
| F3 | **"Favourites only" filter** | Favourites are stored (`localStorage`) and ranked first, but there is no view that hides the rest | S |
| F4 | **Extra sort fields** — temperature, humidity | Sort is fixed to `country/capital/aqi/year` (`RegionsPanel.tsx`) | S |
| F5 | **Broader search** — language, currency, code | `matchesQuery` only checks `country` + `capital` | S |
| F6 | **Light/dark theme toggle** | Design tokens live in `index.scss :root`; a second theme is a CSS-var swap | S |
| F7 | **PWA / offline support** (manifest + service worker) | `index.html` has no manifest; the 1 h localStorage cache makes offline viable | M |
| F8 | **Charts / trends** (temperature sparkline, AQI history) | Pairs with B3; adds a data-viz layer | M |
| F9 | **Compare view** (2–3 countries side by side) | New presentation surface over existing rows | M |
| F10 | **Export / share** (CSV, PNG of a card, deep link) | No export path today | S |
| F11 | **"Last updated" + manual refresh + retry button** | Refresh is a silent hourly `setInterval`; errors show text only (`loadError`) | S |
| F12 | **Virtualised list** | 253 cards use infinite scroll; fine today, but a windowing lib would scale | M |
| F13 | **Clickable map countries** | `WorldMap` is decorative (`aria-hidden`, single land path in `worldMapData.ts`) | L |
| F14 | **Accessibility pass** — map alternative, aria-live for refresh | Map is hidden from AT; refresh status isn't announced | S |

---

## 4. Data features

| # | Feature | Why / evidence | Effort |
| - | ------- | -------------- | ------ |
| D1 | **Population / area / region / subregion** | `CountryInfo` has name/capital/coords/currency/year/language only | S |
| D2 | **Multiple cities per country** | One representative capital per country today | M |
| D3 | **Timezone per subdivision** | Only capital timezones are surfaced | S |
| D4 | **Data refresh / ETL re-run** | `scripts/seed.js` seeds but there's no scheduled refresh of the Wikidata-derived fields | M |

---

## 5. Quality, testing & DevOps

| # | Feature | Why / evidence | Effort |
| - | ------- | -------------- | ------ |
| Q1 | **ESLint + Prettier** | `lint` is only `tsc --noEmit`; no style/lint gate | S |
| Q2 | **Coverage reporting** | No coverage config in either package | S |
| Q3 | **E2E tests (Playwright)** | Only unit/integration tests exist (31) | M |
| Q4 | **Dependabot / `npm audit` in CI** | `npm ci` warns on audit but nothing gates it | S |
| Q5 | **Staging environment** | CI deploys straight to prod on `main` (`deploy.yml`) | M |
| Q6 | **Component test for `RegionsPanel` / `WorldMap`** | Only `RegionCard`, `weatherVisuals`, `strings` are covered | S |
| Q7 | **Container image scanning gate** | Terraform enables ECR scan-on-push, but CI doesn't fail on findings | S |

---

## 6. Suggested sequencing

1. **Quick wins (hours):** B4, B5, B6, F2, F3, F11, Q1, Q2, Q6.
2. **High-value next (days):** B1 + F1 (detail view), B2 + F4/F5 (richer data surfaced), F6, F7, F10.
3. **Bigger bets:** B3 + F8 (forecast + charts), F9 (compare), B9 (Redis for scale), Q3/Q5 (E2E + staging).

Pick by the goal: a **portfolio showcase** → F2/F6/F7/F10 + B2; a **production
service** → B4/B5/B6/B7, B9, Q1/Q3/Q5.
