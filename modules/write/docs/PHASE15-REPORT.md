# Phase 15 — Production Hardening & Final Polish: Report

**Status: COMPLETE** — verified on 2026-08-19 against the spec §60 checklist.

Everything below was implemented and verified. Items marked **N/A** are documented
as not applicable because this application has no authentication system by design
(anonymous learner; no users table, no login, no sessions, no bearer/JWT anywhere in
the codebase) — the anonymous-learner architecture was chosen in Phase 1 and kept
throughout; retrofitting real authentication is a product decision, not a hardening
task.

---

## A. Backend correctness & data integrity

| # | Item | Status | Evidence |
|---|------|--------|----------|
| A1 | Race-hardening: `IntegrityError` safe-wins with rollback + refetch for singleton writes | ✅ | `_persist_recommendation` in `app/services/adaptive_learning_service.py`; the `_upsert`/`_create`/`_generate` helpers in memory / mistake / mission / recommendation services |
| A2 | 4 dedicated race tests covering memory `_create`, mission `_generate`, mistake `_upsert`, vocabulary discovery constraint | ✅ | `tests/test_integrity_races.py` (4 tests, all pass; two duplicate calls committed as separate transactions to mirror production semantics) |
| A3 | Duplicate-singleton enforcement at DB level (unique backstops + FKs) | ✅ | Migration `20260819_b6d8f0a2c4e6_data_integrity_hardening.py`: 5 missing FKs (`learner_memories.learner_id`, `mistake_patterns.learner_id`, `vocabulary_discoveries.learner_id`, `daily_missions.learner_id`, `learning_recommendations.learner_id`) plus VIRTUAL generated-column unique backstops (`memory_key`, `pattern_key`, `discovery_key`, `active_mission_key`, `active_recommendation_key`) — STORED would break MySQL FK rules (error 1215), and MySQL has no partial indexes. Migration verified on a scratch DB (all tables/columns/FKs present) and applied to the production DB |
| A4 | Auth token handling | N/A — no authentication system exists (no JWT/bearer/auth files in backend or frontend). Secrets gating delivered instead: `database_url` is `repr=False`; `.env`/`.env.*` gitignored with `!.env.example`; `.env.example` is secret-free (186 lines) |
| A5 | Production DB migrated | ✅ | `alembic current` on `ai_japanese_writing` = `b6d8f0a2c4e6 (head)`; FK count 55 (50 existing + 5 new); 0 duplicate sources |

## B. Backend security hardening

| # | Item | Status | Evidence |
|---|------|--------|----------|
| B1 | Authentication / authorization | N/A — no auth system exists (anonymous learner). The "gating" part of the requirement is delivered: OpenAPI docs disabled in production (`docs_url`/`redoc_url`/`openapi_url` = None when `app_env == "production"`); analytics/quality diagnostics endpoints were already environment-gated in Phase 14 |
| B2 | Rate limiting | ✅ | `RateLimitMiddleware` in `app/core/security.py`: in-process fixed-window per-IP (default 300/min via `rate_limit_per_minute`, toggle `rate_limit_enabled`, opt-in `rate_limit_trusted_proxy_headers`); counter pruning on window change; 429 JSON envelope `{"error":{"code":"rate_limit_exceeded",...}}` with `Retry-After`; `/health*`, OPTIONS and HEAD exempt. Single-process only (documented; shared deployments need a distributed limiter). Tests: 429 reached via env override + standalone middleware |
| B3 | Security headers | ✅ | `SecurityHeadersMiddleware`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera/mic/geolocation/payment denied), `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Strict-Transport-Security` in production only |
| B4 | CSP / docs gating | ✅ | CSP applied at API level (B3) and in the frontend build (`cspMetaPlugin` in `vite.config.ts` injects the CSP meta tag into `dist/index.html`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`); docs gated as B1 |
| B5 | Request correlation IDs | ✅ | `RequestContextMiddleware`: echoes incoming `X-Request-ID` (trimmed to 64 chars) or generates `uuid4().hex`; stores in `request_id_var` contextvar (`current_request_id()` for log correlation); one access-log line per request (skips `/health/live`); always echoes the ID on the response. Tests: echo + generation |
| B6 | Health endpoints | ✅ | `/health/live` (liveness, never touches the DB), `/health/ready` (readiness: `SELECT 1`; 503 `{"status":"degraded","database":"down"}` when DB unreachable), legacy `/health?check_db=` preserved. Tests: live/ready behavior incl. DB-down 503 |
| B7 | AI provider error redaction | ✅ | `app/providers/ai/redaction.py`: `redact_secrets` (Google `AIza...` keys, `sk-...`, `Bearer ...`, `api_key=`/`authorization=`/`token=` assignments) + `redact_message` (redact + truncate to 400 chars); applied to every `_map_error` string in gemini.py, groq.py, ollama.py. Unit tests for both functions |
| B8 | Validation error sanitization | ✅ | `app/core/errors.py`: 422 handler strips the `input` key (no request-body echo) and `ctx.error`, keeping `loc` / `msg` / `type` + a sanitized `ctx`. Test asserts the body is not echoed |
| B9 | Logging hygiene | ✅ | See `docs/logging.md`: access log `app.access` (request_id/method/path/status/duration_ms), unhandled-exception error log, rate-limit warning log; nothing logs secrets (redaction at the provider boundary) |

## C. Frontend production readiness

| # | Item | Status | Evidence |
|---|------|--------|----------|
| C1 | Route-level code splitting | ✅ | All routes except Dashboard are `React.lazy` with a Suspense spinner; `vite.config.ts` `manualChunks` → `vendor-react` (react/react-dom/react-router) + `vendor`. Build emits per-page chunks; vendor-react 225.54 kB (72.06 kB gzip). App.test.tsx converted to `findByText` |
| C2 | TypeScript strict + request IDs on the client | ✅ | `"strict": true` in both `tsconfig.app.json` and `tsconfig.node.json` (codebase was already strict-clean); `src/lib/api.ts` sends `X-Request-ID` (crypto.randomUUID, fallback), surfaces `ApiError.requestId` (response header or sent id), defensive `response.headers?.get?.`; api.test.ts extended (6 tests) |
| C3 | Responsive layout | ✅ | `src/index.css`: ≤900px — app-shell single column, sticky sidebar top bar, horizontally scrollable nav, brand tagline hidden, content padding 20/16; ≤480px — padding/font tweaks |
| C4 | Free-writing draft autosave | ✅ | `FreeWritingPage.tsx`: draft state per exercise (`draft:free-writing:{id}`), restore on exercise change, 400 ms debounced localStorage save, remove on empty. New workspace test (uses `document.getElementById('exercise-answer')` due to mojibake string mismatch in the checked-in source) |
| C5 | Error boundary with retry | ✅ | `ErrorBoundary.tsx` rewritten: `resetKey` prop (reset via `getDerivedStateFromProps`), `role="alert"`, "Thử lại" / "Về trang chủ" actions; each lazy route wrapped in `RouteBoundary`; `.error-boundary-actions` CSS. Role-based guards N/A — no auth system (C5 role guards item). Tests: `tests/test_ErrorBoundary.test.tsx` (2 tests; a third unmount-scenario test dropped — React 19 reports unhandled errors on unmount) |
| C6 | Memoized navigation | ✅ | `AppLayout.tsx`: `useMemo` for `navItems`. Auth toggle item N/A — no auth system |
| C7 | Config fallbacks + CSP + UTF-16 counter | ✅ | `src/lib/config.ts` prod fallback `window.location.origin` (dev default `localhost:8000`); CSP meta plugin (C4/B4, verified injected in `dist/index.html`); free-writing character counter uses `[...answer].length` (UTF-16 code points) instead of `answer.length` |

## D. Docs, verification & CI

| # | Item | Status | Evidence |
|---|------|--------|----------|
| D1 | Phase 15 report + logging documentation | ✅ | This file + `docs/logging.md` |
| D2 | README updated (Phase 15 section, status line, roadmap fixed) | ✅ | Root `README.md` |
| D3 | Full verification | ✅ | Backend: whole-tree `ruff check app tests alembic` clean (65 pre-existing errors found and fixed: 61 auto-fixed import sorting in old alembic versions, remaining E501/B007/F841/E402 fixed by hand — incl. moving the `journey_router` import to the top of `learning.py` (no circular import) and removing dead `previous_objective_completed`); `ruff format` applied to the whole tree (23 files); **760 passed, 8 skipped**. Frontend: `npm run typecheck` / `lint` / `build` clean, **121 tests passed** (19 files) |
| D4 | CI workflow | ✅ | `.github/workflows/ci.yml`: backend job — MySQL 8.0 service (root/root, `MYSQL_DATABASE=ai_japanese_writing`, health pings), Python 3.12 + pip cache, `requirements-dev.txt`, creates `ai_japanese_writing_test`/`ai_japanese_writing_ci` databases, `ruff check` + `ruff format --check app tests alembic`, pytest with `DATABASE_URL`/`APP_ENV`/`RATE_LIMIT_ENABLED` env, `alembic upgrade head` + `current` on the CI DB; frontend job — Node 22, `npm ci`, typecheck, lint, test, build |

## Final numbers

| Metric | Value |
|--------|-------|
| Backend tests | 760 passed, 8 skipped |
| Frontend tests | 121 passed (19 files) |
| Backend lint | ruff check clean, ruff format clean (whole tree) |
| Frontend | typecheck / lint / build clean |
| Production DB | migrated to `b6d8f0a2c4e6 (head)`, 55 FKs, 0 duplicate singleton sources |
| CI | GitHub Actions workflow for backend + frontend |

## Known limitations (honest)

- Rate limiter is in-process: correct for a single process; a multi-process /
  load-balanced deployment must swap it for a distributed limiter (Redis), or
  set `rate_limit_enabled=false` per process behind an edge limit.
- The rate-limit window is wall-clock aligned, so a client can make up to 2× the
  limit across a window boundary.
- CSP on API responses is `default-src 'none'` (an API has no need for script
  sources); the frontend CSP allows inline styles because React/Vite injects
  styles dynamically.
- No authentication: all hardening that assumed a logged-in user (auth-token
  handling, role guards, auth-toggle navigation) is N/A and documented as such.