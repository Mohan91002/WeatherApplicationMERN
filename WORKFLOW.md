# Project Workflow — Jira ↔ Git

How this project is run like a real delivery: **Jira issues drive short-lived
git branches**, which merge to `main` via pull request, which triggers deploy.

This doc adds the **issue → branch → PR** linkage. For the mechanics of
branching, testing, PRs and deploys, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Jira project

- **Project key:** `WEA` (WeatherApplication)
- **Backlog:** [jira-backlog.csv](jira-backlog.csv) —
  import via *Jira → System → External System Import → CSV*, mapping
  `Epic Link` (Story→Epic), `Parent Id` (Sub-task→Story) and `Sprint`.
- **Hierarchy:** **6 Epics → 27 Stories → 78 Sub-tasks**, plus **5 Spikes**;
  ~18 Bugs are raised as found. **116 issues pre-created (~134 with bugs).**
- Delivered across **4 two-week sprints** — see [PROJECT_PLAN.md](PROJECT_PLAN.md) §4.

| Epic key | Epic | Stories |
| -------- | ---- | :-----: |
| WEA-1 | Backend API foundation | 5 |
| WEA-2 | Currency & founding-year data | 4 |
| WEA-3 | Frontend UI & interactive map | 8 |
| WEA-4 | Testing & QA | 3 |
| WEA-5 | DevOps & AWS deployment | 5 |
| WEA-6 | Project management & UX | 2 |

---

## Issue lifecycle (how a ticket becomes code)

1. **To Do → In Progress.** Pick a story, e.g. `WEA-113 Station-model region card`.
2. **Branch** off `main`, named after the key:
   `git switch -c feature/WEA-113-station-card`
3. **Commit** with the key in the subject so Jira links the work automatically:
   `git commit -m "WEA-113: add station-model card layout"`
4. **Pull request** against `main`; CI runs the backend + frontend tests on the PR.
5. **Review → squash-merge**, delete the branch; Jira moves the story to **Done**.
6. **Deploy.** Landing on `main` builds/pushes the API image and publishes the SPA
   (deploys never run from a PR) — see [cloud/DEPLOY.md](cloud/DEPLOY.md).

Sub-tasks are usually separate commits on the story's branch; a large story may
use one branch per sub-task. Bugs use `fix/WEA-<id>-<slug>`, spikes use
`spike/WEA-<id>-<slug>`.

---

## Branch naming

`feature/WEA-<id>-<slug>` (stories) · `fix/WEA-<id>-<slug>` (bugs) ·
`spike/WEA-<id>-<slug>` (spikes). Prefixes match [CONTRIBUTING.md](CONTRIBUTING.md).

> **Note:** the branches below are created to mirror the backlog structure.
> Because the app is already delivered on `main`, each starts level with `main`;
> in a live project each would instead carry that story's commits before merging.

---

## Story → branch map

### Sprint 1 — Foundation & design
| Ticket | Story | Epic | Branch |
| ------ | ----- | ---- | ------ |
| WEA-101 | Scaffold Node/Express API + CORS + MongoDB | BACKEND | `feature/WEA-101-scaffold-api` |
| WEA-102 | Countries dataset served at /api/countries | BACKEND | `feature/WEA-102-countries-dataset` |
| WEA-103 | WeatherClassifier (code/AQI/°C→°F) | BACKEND | `feature/WEA-103-weather-classifier` |
| WEA-104 | Open-Meteo integration (chunk/retry/merge/cache) | BACKEND | `feature/WEA-104-open-meteo-integration` |
| WEA-105 | Browser-relay fallback POST /api/regions/merge | BACKEND | `feature/WEA-105-browser-relay-fallback` |
| WEA-106 | React scaffold + weather API client + types | FRONTEND | `feature/WEA-106-react-scaffold` |
| WEA-107 | UX design + prototypes | PMUX | `feature/WEA-107-ux-design` |

### Sprint 2 — Data enrichment & cards
| Ticket | Story | Epic | Branch |
| ------ | ----- | ---- | ------ |
| WEA-108 | Live FX rates service (open.er-api, cached) | DATA | `feature/WEA-108-fx-rates-service` |
| WEA-109 | Enrich dataset with currency (code + symbol) | DATA | `feature/WEA-109-enrich-currency` |
| WEA-110 | Enrich dataset with founding year (Wikidata) | DATA | `feature/WEA-110-enrich-founding-year` |
| WEA-111 | Enrich dataset with official language | DATA | `feature/WEA-111-official-language` |
| WEA-112 | Weather-board design system (tokens, type, layout) | FRONTEND | `feature/WEA-112-design-system` |
| WEA-113 | Station-model region card | FRONTEND | `feature/WEA-113-station-card` |
| WEA-114 | Regions panel: sort/search/favourites | FRONTEND | `feature/WEA-114-regions-panel` |

### Sprint 3 — Map, responsive & tests
| Ticket | Story | Epic | Branch |
| ------ | ----- | ---- | ------ |
| WEA-115 | Infinite scroll with scroll-up unload | FRONTEND | `feature/WEA-115-infinite-scroll` |
| WEA-116 | Interactive world-map backdrop | FRONTEND | `feature/WEA-116-world-map` |
| WEA-117 | Timezone label + responsive grid | FRONTEND | `feature/WEA-117-timezone-responsive-grid` |
| WEA-118 | Backend unit + integration tests (xUnit) | QA | `feature/WEA-118-backend-tests` |
| WEA-119 | Frontend component/service specs (Karma) | QA | `feature/WEA-119-frontend-specs` |
| WEA-120 | Dockerize API (multi-stage, non-root) | DEVOPS | `feature/WEA-120-dockerize-api` |
| WEA-121 | Config-driven CORS + secrets/config | DEVOPS | `feature/WEA-121-config-cors` |

### Sprint 4 — Deploy, harden & go-live
| Ticket | Story | Epic | Branch |
| ------ | ----- | ---- | ------ |
| WEA-122 | CI/CD pipeline (GitHub Actions + OIDC) | DEVOPS | `feature/WEA-122-cicd-pipeline` |
| WEA-123 | AWS infra as code (Terraform) | DEVOPS | `feature/WEA-123-aws-terraform` |
| WEA-124 | Observability (health, logs, dashboard, alarms) | DEVOPS | `feature/WEA-124-observability` |
| WEA-125 | Manual QA + cross-browser + accessibility | QA | `feature/WEA-125-manual-qa-a11y` |
| WEA-126 | Hardening + bug-fix buffer | PMUX | `feature/WEA-126-hardening-buffer` |

### Ongoing
| Ticket | Story | Epic | Branch |
| ------ | ----- | ---- | ------ |
| WEA-127 | Sprint ceremonies + backlog grooming | PMUX | `feature/WEA-127-ceremonies` † |

† Ceremonies is tracked as a Jira story but in practice has no code branch — it
is listed here only for completeness of the backlog mapping.
