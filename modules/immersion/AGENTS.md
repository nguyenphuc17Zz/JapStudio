# JapImmersion — Module AI Router & Architecture Guide (Module 3)

> **MANDATORY FOR ALL AI AGENTS:**
> This file defines the scope, rules, and boundaries for Module 3: **Japanese Immersion**.

---

## 🎯 1. Module Overview & Boundaries

- **Role**: Japanese Content Ingestion & Extensible Connector Engine.
- **Phase 1 Primary Goal**: **Source Manager** (CRUD, connector registry, health monitoring, test connection, presets, manual sync, activity logs, import/export).
- 🚨 **CRITICAL BOUNDARY**:
  - Phase 1 does **NOT** build Reading UI, Quizzes, SRS, or AI Enrichment (summaries, grammar/vocab extraction).
  - Strictly preserve separation from JapSpeak (Speaking) and JapWrite (Writing).

---

## ⚡ 2. Tech Stack & Port Isolation

| Component | Technology | Port | Verification Command |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 14 App Router, React 18, TailwindCSS, Lucide icons | **3002** | `npm run typecheck` (`tsc --noEmit`) |
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), SQLite `immersion.db` (`aiosqlite`), Pydantic v2 | **8002** | `.\.venv\Scripts\python.exe -m pytest` |

---

## 🛡️ 3. Security Guardrails

1. **SSRF Protection (`SSRFValidator`)**:
   - All outgoing requests must validate URL scheme (`http`/`https` only) and verify destination IP is NOT in blocked private/loopback/metadata CIDRs (e.g. `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`, `::1`).
2. **Credential Privacy**:
   - Secrets are encrypted via `app.core.security` (Fernet symmetric encryption).
   - API endpoints and frontend MUST NEVER expose raw secrets; only return masked values (e.g. `sk-12...cdef`).

---

## 🔌 4. Connector Architecture

All content connectors inherit from `ContentSourceConnector` in `app/connectors/base.py` and register with `ConnectorRegistry`:
- `validate_config(config, headers) -> (bool, str)`
- `test_connection(source, decrypted_secret) -> TestConnectionResult`
- `fetch(source, decrypted_secret, limit) -> FetchResult`
- `health_check(source, decrypted_secret) -> HealthCheckResult`
- Standardized output: `StandardRawItem`
