# Logging

## Loggers

| Logger | Where | Lines |
|--------|-------|-------|
| `app.access` | `app/core/security.py` — `RequestContextMiddleware` | one INFO line per request |
| `app.access` (error) | same middleware | one ERROR line on unhandled exception |
| `app.access` (warning) | same middleware — `RateLimitMiddleware` | one WARNING line per rate-limit rejection |
| application loggers | `app/...` services, repositories, providers | domain events (warnings/errors) |

## Access log format

```
request_id=<id> method=<METHOD> path=<path> status=<code> duration_ms=<ms>
```

- `request_id` is the `X-Request-ID` echoed from the client (trimmed to 64 chars)
  or a generated `uuid4().hex`.
- One line per request, after the response is produced.
- `/health/live` is skipped (it can be hit every few seconds by orchestrators);
  `/health/ready` is logged.
- On an unhandled exception the middleware logs
  `request_id=... method=... path=... status=500 error=unhandled` and re-raises.

## Correlation

- Every response carries the request ID back in `X-Request-ID`.
- Inside request handling, `app.core.security.current_request_id()` returns the
  active ID for the current task — use it when adding custom log fields so
  log lines can be correlated with the access line.
- The frontend sends `X-Request-ID` on every API call (`src/lib/api.ts`) and
  surfaces `ApiError.requestId` on failures, so a UI error can be matched to a
  backend access line.

## What is never logged

- Secrets: provider error messages pass through `app/providers/ai/redaction.py`
  (`redact_secrets` + `redact_message`, truncation at 400 chars) before logging,
  covering Google API keys (`AIza...`), `sk-...` keys, `Bearer` tokens, and
  `api_key=` / `authorization=` / `token=` assignments.
- Request bodies: validation errors are sanitized (`app/core/errors.py` strips
  `input` and `ctx.error`); access logs contain method/path/status only.
- `DATABASE_URL` never appears in settings reprs (`repr=False`).

## Configuration

Loggers are configured via the standard Python `logging` hierarchy (`app.*`,
`uvicorn.*`). The access logger is `app.access`; tune it via normal logging
configuration (e.g. `logging.getLogger("app.access").setLevel(...)`).