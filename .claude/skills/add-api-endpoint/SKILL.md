---
name: add-api-endpoint
description: Add a new HTTP endpoint to the World Weather Express API following the repo's architecture rule (all business logic in the backend) and its test/lint/format conventions.
---

# Add an API endpoint

The golden rule: **all business logic lives in the backend; the React SPA is
presentation-only.** Never compute domain values (classification, merging,
unit conversion) in the frontend.

## Steps

1. Add the route in `backend/src/routes/weatherRoutes.js` (all routes live here).
   Keep handlers thin — delegate to a service.
2. Put logic in `backend/src/services/` (pure functions where possible, e.g.
   `weatherClassifier.js`). Add JSDoc types like the existing services.
3. If the response shape is new, mirror it in `frontend/src/types/` and consume
   it from `frontend/src/api/weatherApi.ts`.
4. Add a test in `backend/tests/` using `node:test` + `supertest` (drive the app
   in-memory via `createApp()`; stub `global.fetch` for upstream calls).
5. Run the gate: `npm run quality` (see the `quality-gate` skill).
6. Update `README.md` / `ARCHITECTURE.md` if the public API surface changed.

## Conventions

- ES modules, single quotes, trailing commas, 2-space indent (Prettier).
- Unused params/vars must be prefixed with `_`.
- Cache upstream responses via `backend/src/services/cache.js` (1 h TTL pattern).
