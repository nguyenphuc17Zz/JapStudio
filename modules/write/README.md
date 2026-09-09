# AI Japanese Writing Tutor

An AI-powered Japanese writing practice web application that helps users improve Japanese writing through Vietnamese → Japanese translation, AI-generated free-writing tasks, deep feedback, naturalness analysis, adaptive difficulty, vocabulary intelligence, AI-powered gamification, and a long-term AI learning-journey engine (goal → milestones → objectives).

**Current status: ROADMAP EXPANDED — PHASES 1–23 COMPLETE.** Project Foundation, AI Gateway, AI Exercise Generation, Writing Evaluation, Vocabulary Intelligence, Adaptive Learning, Gamification, Long-form Writing & Discourse Intelligence, Real-world Writing Modes & AI Scenario Intelligence, AI Interactive Writing Simulation, AI Quality, Evaluation & Reliability Intelligence, Personal AI Memory & Contextual Tutor Intelligence, AI Curriculum & Learning Journey Engine, Product Intelligence / Learning Analytics & Optimization, Production Hardening & Final Polish, Writing Intelligence Foundation (Phase 16), Persistent Error & Mastery Engine (Phase 17), Targeted Writing Drill Engine (Phase 18), Self-Correction & Rewrite Lab (Phase 19), Real-World Writing Mission System (Phase 20), Japanese Expression Intelligence (Phase 21), Adaptive Writing Curriculum 2.0 (Phase 22), and Writing Mastery & Boss Assessment (Phase 23). Phase 1 delivered the application skeleton (frontend, backend, database, AI provider abstraction, testing foundation). Phase 2 added the multi-provider AI gateway (Gemini / Groq / Ollama), retry/fallback logic, provider diagnostics, and API-key configuration from the UI. Phase 3 added the AI exercise generation pipeline (planner → generator → validator), the `exercises` table with generation metadata, duplicate protection, and the Practice / Free Writing pages in the UI. Phase 4 added the writing evaluation engine: a 5-stage AI pipeline (semantic → grammar/vocabulary → naturalness/register → corrections → hints), a weighted synthesis of 6 dimension scores into an overall score, consistency validation with automatic regeneration, immutable attempts with learning mode (progressive hints + reveal), and the full attempt UI in the Practice / Free Writing pages. Phase 5 added the vocabulary intelligence layer: an AI extraction → validation → explanation pipeline that builds a personal vocabulary bank from learner submissions (with deduplication, per-attempt discovery provenance, familiarity tracking and re-extraction), plus the Vocabulary Bank pages in the UI. Phase 6 added the adaptive learning engine: deterministic learner evidence (per-skill scores, JLPT band, 7-day trends) framed by AI profile synthesis, mistake clustering, a 70/20/10 strategy planner (targeted / reinforcement / exploration), one active AI recommendation at a time with a generated exercise, daily learning sessions, and learner dashboards (focus + recommendation) plus settings (goal, target JLPT, daily target, register/topic preferences) in the UI. Phase 7 added the gamification experience layer: a deterministic XP ledger with idempotent awards and levels, timezone-aware streaks, daily goals, one AI daily mission per day, AI writing challenges with deterministic success criteria, milestone celebrations, encouragement and daily progress summaries, plus gamification UI on the dashboard, the Practice page challenge mode, the dedicated Thử thách page, and the streak setting. Phase 12 added the personal AI memory layer: a persistent `learner_memories` store built by an AI extraction → validation → conflict-detection → resolution pipeline (all gated by the Phase 11 quality layer), deterministic relevance retrieval, memory blocks injected into coaches, planners, exercise/scenario generation and simulations, plus the Trí nhớ page and a memory toggle in settings. Phase 13 added the AI curriculum & learning-journey engine: long-term journeys (goal → milestones → objectives) with deterministic entry criteria, mastery thresholds and progression, AI planning gated by a controlled taxonomy and quality validators, evidence attribution from exercises / scenarios / simulations / missions / challenges, stagnation-triggered AI replanning, objective-linked XP rewards, plus the Lộ trình page, a journey card on the dashboard, a goal-type selector in settings and an objective banner on the practice page. Phase 16 added the Writing Intelligence Layer: a persistent `writing_weaknesses` store with 5-dimension error taxonomy, writing fingerprint, and AI comprehensive diagnosis. Phase 17 added the Persistent Error & Mastery Engine: 7-state deterministic lifecycle, regression on recurrence, evidence-based multi-factor mastery across 6 writing contexts, spaced delayed retests, and AI narrative coaching. Phase 18 added the Targeted Writing Drill Engine: adaptive 4-stage drill sequences tailored to learner-specific weaknesses, intelligent nuance evaluation, debrief synthesis, progressive scaffolding, and spaced retest practice. Phase 19 added the Self-Correction & Rewrite Lab: a 6-step progressive self-correction ladder with zero answer leakage, 4-way controlled comparison with mandatory synthesis sentence, 6 rewrite transformation modes, linguistic diff with grammatical reasoning, and novel scenario transfer check. Phase 20 added the Real-World Writing Mission System: 4 practical categories, 23 action taxonomies, 3 prompt immersion modes (Bilingual, 100% Japanese, In-Basket simulation), 10-dimensional evaluation, and live transition into simulations. Phase 21 added Japanese Expression Intelligence: collocation map, personal expression bank with automatic background extraction, overuse radar, 3-tier L1 transfer detection, 5-tier register ladder, and 3-way natural expression variation. Phase 22 added Adaptive Writing Curriculum 2.0: 8-signal deterministic priority scoring engine, 70/20/10 daily writing plan allocation, 8-context progression cycle, 4-dimensional sliding-window fatigue guard, and safe AI curriculum enrichment. Phase 23 added Writing Mastery & Boss Assessment: independent 8-dimension mastery model (grammar, vocabulary precision, collocation, naturalness, register, discourse, task completion, contextual adaptability), strict deterministic 5-criterion proof verification, unassisted realistic Boss Writing Arena (no hints, no translation, unseen context, countdown timer, adversarial traps), 8-dimension evaluator with 3-tier native model rewrites and historical delta comparison, regression detection with adaptive curriculum demotion & reactivation, and longitudinal evolution timeline tracking.

## Repository layout

```
apps/
├── web/                          # React + TypeScript + Vite frontend
│   └── src/
│       ├── components/           # shared UI (ErrorBoundary, Loading, EmptyState, ...)
│       ├── pages/                # route shells (Dashboard, Practice, Free Writing, ...)
│       ├── layouts/              # application layout (sidebar navigation)
│       ├── services/             # typed API client
│       ├── hooks/                # shared React hooks
│       ├── types/                # API/domain types
│       └── lib/                  # fetch wrapper, environment config
└── api/                          # FastAPI backend
    ├── app/
    │   ├── api/                  # routers (health, exercises, AI diagnostics, quality/benchmark)
    │   ├── core/                 # configuration, logging, error handling
    │   ├── db/                   # engine, session, declarative base
    │   ├── domain/               # deterministic taxonomies (scenario/simulation formats)
    │   ├── models/               # SQLAlchemy domain models
    │   ├── prompts/              # versioned prompt templates + prompt registry
    │   ├── quality/              # quality layer: registry, policy, validators, telemetry, benchmark
    │   ├── repositories/         # database access layer
    │   ├── schemas/              # Pydantic request/response schemas
    │   ├── services/             # business logic layer (incl. exercise generation pipeline)
    │   ├── providers/            # AI provider abstraction + fake provider
    │   └── main.py               # application entry point
    ├── alembic/                  # database migrations
    ├── benchmark/golden/         # golden benchmark JSON dataset (107 cases)
    ├── scripts/                  # CLI tools (benchmark runner, database setup)
    └── tests/                    # backend test suite
```

## Architecture

Request flow (backend):

```
HTTP Request → Router → Service → Repository → Database
```

Future AI flow:

```
Service → AI Router → AIProvider → Gemini / Groq / Ollama
```

Principles enforced in Phase 1:

- Routers never touch the database directly.
- Repositories never contain business logic.
- Services never depend on concrete AI providers (only on the `AIProvider` interface / `AIRouter`).
- No API keys or credentials are hard-coded; everything comes from environment variables.
- UUID v4 string identifiers and timezone-aware `created_at` / `updated_at` timestamps on all tables.

## AI gateway (Phase 2)

- **Providers**: `fake` (built-in, no credentials), `gemini` (official `google-genai` SDK), `groq` (official `groq` SDK), `ollama` (official `ollama` package, default host `127.0.0.1:11434`).
- **Selection priority**: explicit request provider → `AI_DEFAULT_PROVIDER`.
- **Retry**: transient failures (`AITimeoutError`, `AIRateLimitError`, `AIProviderUnavailableError`) are retried up to `AI_MAX_RETRIES` times with exponential backoff starting at `AI_RETRY_BACKOFF` seconds.
- **Fallback**: after retries are exhausted, providers in `AI_FALLBACK_PROVIDERS` are tried in order (unconfigured fallbacks are skipped). Permanent errors — bad configuration, invalid API key — are never retried or hidden; they surface immediately.
- **Structured output**: all providers validate responses against the Pydantic model; Gemini uses `response_schema`, Groq uses `json_object`, Ollama uses `format=json` plus a schema hint in the system prompt, and all pass through the shared JSON extraction/validation helper.
- **Streaming**: chunks are normalized as `AIStreamChunk` with `is_final` and aggregated usage; mid-stream failures are not retried or re-fallen-back (content integrity).
- **Error hierarchy**: `AIError` → `AIConfigurationError`, `AIAuthenticationError`, `AIRateLimitError`, `AITimeoutError`, `AIProviderUnavailableError`, `AIInvalidRequestError`, `AIResponseError`, `AIUnsupportedFeatureError` — rendered through the standard `{error: {code, message, details}}` envelope.
- **Logging**: provider calls log provider, model, duration, retries, fallback and error class; API keys and request content are never logged.

### Configuring API keys from the UI

API keys can be set either via environment variables or from the **Cài đặt → Khóa API** page. Values saved in the UI are persisted in the `ai_provider_configs` table and override environment variables (the most recent action wins). Keys are never returned to the browser: the UI only receives a masked preview (e.g. `AIza****7890`).

### AI endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/ai/providers` | provider status: configured / available / default model / capabilities |
| `GET /api/v1/ai/providers/config` | masked credential view (never raw keys) |
| `PUT /api/v1/ai/providers/config` | save API keys / base URLs (empty string clears) |
| `GET /api/v1/ai/models` | models advertised by each configured provider (per-provider errors are isolated) |
| `POST /api/v1/ai/generate` | dev/test text generation; disabled in production (`404`) |

## Exercise generation (Phase 3)

- **Pipeline**: each exercise goes through three AI stages — `exercise_planner:v1` (plan: type, topic, subtopic, context, target length, register, JLPT level, complexity scores, naturalness target) → `exercise_generator:v1` (write the Vietnamese prompt) → `exercise_validation:v1` (verify type / register / target-length consistency, cross-check complexity ±3 against the plan).
- **Regeneration**: if the validator rejects a draft, the generator retries up to `AI_EXERCISE_MAX_REGENERATION_ATTEMPTS` times; a final failure surfaces as a `502 exercise_generation_error`.
- **Duplicate protection**: prompts are normalized (lowercase, diacritics stripped, punctuation collapsed) and stored as a SHA-256 hash; exact duplicates are rejected before generation, and near-duplicates are detected over the recent `AI_EXERCISE_RECENT_PROMPT_WINDOW` exercises using sequence similarity above `AI_EXERCISE_NEAR_DUPLICATE_THRESHOLD`. Duplicate attempts return `409 duplicate_exercise`.
- **Generation metadata**: every exercise stores provider, model, prompt version, generation version, timestamp and regeneration attempts in a JSON column, and the API response includes `generation_metadata` so output provenance is auditable.
- **Exercise types**: `sentence_translation`, `multi_sentence_translation`, `paragraph_translation`, `free_writing`, `register_challenge`; lengths from `short_sentence` to `long_writing`; registers `casual` / `polite` / `business` / `mixed`; JLPT `N5`–`N1`.
- **Provider routing**: generation uses `AI_EXERCISE_GENERATION_PROVIDER` (defaults to `AI_DEFAULT_PROVIDER`) with model `AI_EXERCISE_GENERATION_MODEL`; per-stage model overrides are available via `AI_EXERCISE_GENERATION_MODEL_PLANNER` / `_GENERATOR` / `_VALIDATOR`.
- **Fake provider**: fully implements the plan/generate/validate contract (with `$ref` enum resolution) so the whole pipeline runs offline and deterministically; identical fake drafts make repeated generation return `409` — good for testing duplicate handling.

### Exercise endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/exercises/generate` | generate + persist one exercise; all body fields optional (preferences) |
| `GET /api/v1/exercises` | list with filters: `exercise_type`, `topic`, `register`, `jlpt_level`, `difficulty` (min/max), `skip`, `limit` |
| `GET /api/v1/exercises/{id}` | fetch one persisted exercise |

## Writing evaluation (Phase 4)

- **Pipeline**: each submission runs five AI stages in order — `semantic_evaluation:v1` (meaning equivalence + omissions / additions / meaning changes) → `grammar_vocabulary_evaluation:v1` (categorized issues) → `naturalness_register_evaluation:v1` (naturalness score + register fit + context fit) → `correction_generation:v1` (correct / natural / native rewrites + casual / polite / business variants) → `hint_generation:v1` (1–6 progressive hints). An optional verifier (`evaluation_verification:v1`) can add a sixth check.
- **Scores**: six dimensions (semantic, grammar, vocabulary, naturalness, context fit, register fit) are synthesized into one deterministic overall score with configurable weights (default 25 / 20 / 10 / 30 / 10 / 5, normalized if the sum ≠ 100). `context_fit_score` is produced by the naturalness/register stage.
- **Consistency validation**: every stage result is checked against score bands (e.g. `fully_equivalent` must score 85–100, `meaning_changed` 0–50, low register fit requires a register issue). Contradictory results reject the whole cycle and the pipeline regenerates, up to `1 + AI_EXERCISE_EVALUATION_MAX_RETRIES` cycles; exhaustion returns `502 evaluation_error`.
- **Learning mode** (on by default): submissions receive hints and a summary immediately; corrections are hidden until the learner asks for the next hint (up to the hint count) or reveals the answer explicitly. `AI_EXERCISE_LEARNING_MODE_ENABLED=false` returns corrections immediately.
- **Immutable attempts**: `attempt_number` is a per-exercise sequence with a unique constraint; only learning-mode state (`hints_revealed_count`, `revealed`) ever changes after submission. `user_id` is nullable (no auth yet).
- **Provenance**: `evaluation_metadata` records provider, model, prompt version, retries and timestamp per stage plus the overall `writing_evaluation:v1` version; credentials are never logged or stored.
- **Provider routing**: evaluation uses `AI_EXERCISE_EVALUATION_PROVIDER` (falls back to generation provider, then `AI_DEFAULT_PROVIDER`) with per-stage model overrides (`AI_EXERCISE_EVALUATION_MODEL_SEMANTIC` / `_GRAMMAR` / `_NATURALNESS` / `_CORRECTION` / `_HINT`).
- **Fake provider**: implements all evaluation stages deterministically with coherent samples, so the entire engine runs offline and tests are stable.

### Attempt endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/exercises/{id}/attempts` | submit an answer, evaluate it, persist the attempt |
| `GET /api/v1/exercises/{id}/attempts` | paginated history (newest first, `skip` / `limit`) |
| `GET /api/v1/exercises/{id}/attempts/{attempt_id}` | persisted evaluation (corrections included only if learning mode is off or already revealed) |
| `POST /api/v1/exercises/{id}/attempts/{attempt_id}/hint` | next progressive hint; `409` when hints are exhausted |
  | `POST /api/v1/exercises/{id}/attempts/{attempt_id}/reveal` | idempotent reveal of correct / natural / native / register-variant versions |

## Vocabulary intelligence (Phase 5)

- **Pipeline**: every evaluated submission runs three AI stages for vocabulary — `vocabulary_extraction:v1` (candidate expressions + reading / meaning / JLPT / register / usage context / example / natural alternatives) → `vocabulary_validation:v1` (approve, reject with reason, or mark as a duplicate of an existing entry; corrections applied) → `vocabulary_explanation:v1` (learning reason, notes, refined example and alternatives for newly created entries). A failed validation or explanation stage degrades gracefully (candidate skipped / candidate fields kept) without breaking the attempt.
- **Auto-extraction**: extraction runs automatically after each submission (configurable via `AI_VOCABULARY_AUTO_EXTRACT_ENABLED`, default `true`); failures are logged and never affect the evaluation response. Extraction can also be triggered manually per attempt (`POST /vocabulary/reprocess/{attempt_id}`, `POST /attempts/{attempt_id}/vocabulary/extract`).
- **Entry lifecycle**: candidate expressions are normalized (lowercase, katakana→hiragana, punctuation stripped) and deduplicated against the bank; duplicates merge into the existing entry instead of creating new rows. Discoveries are event records keyed on (attempt, entry, source type) — re-running extraction for the same attempt is idempotent and adds no duplicate discoveries or counter bumps.
- **User state**: each entry tracks `discovered_count` / `seen_count` / `used_count` / `incorrect_count` / `correct_usage_count` and a derived familiarity level (`new` → `learning` → `familiar` → `strong`): strong = used ≥ 6 and correct ≥ 4 and incorrect ≤ 1; familiar = used ≥ 3 and correct ≥ 2; learning = discovered ≥ 2 or seen ≥ 2 or incorrect ≥ 1.
- **Provenance**: entries store provider, model, prompt version and `vocabulary_version` (`vocabulary:v1`); each discovery records its source attempt, exercise, `source_type` (`user_answer` / `ai_correction` / `ai_natural` / `ai_native` / `ai_register_variant` / `ai_explanation`) and the user's original expression when the candidate replaced a learner word.
- **Provider routing**: extraction / validation / explanation use `AI_VOCABULARY_PROVIDER`, falling back to the evaluation provider, then the generation provider, then `AI_DEFAULT_PROVIDER`; per-stage model overrides (`AI_VOCABULARY_MODEL` / `_VALIDATION_MODEL` / `_EXPLANATION_MODEL`). Candidates below `AI_VOCABULARY_MIN_IMPORTANCE` or with low confidence are skipped.
- **Fake provider**: implements all three vocabulary stages deterministically (e.g. 「立て込む」/「仕事が立て込んでいる」 from a busy-work submission), so the whole pipeline runs offline and tests are stable.
- **UI**: the Practice / Free Writing pages show up to 5 noteworthy expressions per attempt; the Vocabulary Bank page (`/vocabulary`) offers search, filters (type, JLPT, difficulty, register, source type) and pagination, and the entry detail page shows meaning, usage, alternatives, discovery history with per-attempt context, and technical provenance.

### Vocabulary endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/vocabulary` | bank list with `type` (alias for `type`), `jlpt_level`, `difficulty_min` / `difficulty_max`, `register`, `source_type`, `search`, `skip` / `limit` |
| `GET /api/v1/vocabulary/{vocabulary_id}` | full entry detail: fields, user state, discovery history, provenance |
| `POST /api/v1/vocabulary/reprocess/{attempt_id}` | re-run the full extraction pipeline for one attempt (idempotent) |
| `POST /api/v1/exercises/{id}/attempts/{attempt_id}/vocabulary/extract` | manual extraction for one attempt |
| `GET /api/v1/exercises/{id}/attempts/{attempt_id}/vocabulary` | expressions discovered from a specific attempt |

## Adaptive learning engine (Phase 6)

- **Learner evidence**: deterministic per-skill scores (grammar, vocabulary, naturalness, semantic, context fit, register fit) computed from the last `AI_LEARNING_EVIDENCE_WINDOW` evaluations, recency-weighted by `exp(-age_days / AI_LEARNING_RECENCY_HALF_LIFE_DAYS)`, with per-skill confidence (≥10 evaluations high, 3–9 medium, <3 low), a 7-day trend (improving / stable / declining), a JLPT band (easiest floor – hardest ceiling) and strengths (≥70) / weaknesses (<65).
- **Profile synthesis** (`learner_profile_synthesis:v1`): the AI provides qualitative framing (goal advice, strengths/weaknesses narrative, explanation); computed numbers (skills, JLPT band, trends) always come from the deterministic evidence and are never overridden by the AI. The profile auto-refreshes after `AI_LEARNING_PROFILE_REFRESH_INTERVAL` evaluations and is exposed on the dashboard.
- **Mistake clustering** (`mistake_clustering:v1`): recurring issue categories detected per skill are clustered by the AI (canonical label, category, severity provenance, evidence counters) or fall back to deterministic category aggregation; clusters feed the planner's weakness list.
- **Planner** (`learning_planner:v1`): recommends one exercise at a time with a 70/20/10 strategy mix — `targeted` (weakness drilling, when any skill < 50), `reinforcement` (maintenance) and `exploration` (new topics). Difficulty and JLPT are clamped to the learner's level (`AI_LEARNING_MAX_DIFFICULTY_STEP`, `AI_LEARNING_MAX_JLPT_STEP`); topic selection avoids recently used ones; `learning_planner:v1` output is validated/adjusted deterministically before persistence.
- **Recommendations**: only one `recommended` recommendation exists at a time — requesting a new one marks the previous as `replaced`; completing the linked exercise records `skill_before` / `skill_after` for effectiveness tracking. A `recommendation_explanation:v1` stage generates a learner-facing reason, with a deterministic fallback.
- **Sessions**: one `learning_sessions` row per calendar day (auto-created, `exercises_completed` incremented after every evaluated attempt); failed learning updates never raise or block the writing flow.
- **UI**: the dashboard shows the learner focus (goal, target JLPT, evidence count, trend cards, strengths / weaknesses) and today's recommendation; the Practice page offers three modes — AI gợi ý (recommended exercise), Tùy chỉnh (manual criteria) and Ngẫu nhiên (random); the Settings page edits the learner profile (goal, target JLPT, daily target, preferred registers and topics).
- **Fake provider**: implements the four learning stages deterministically so the whole engine runs offline and tests are stable.

### Learning endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/learning/profile` | learner profile (preferences + evidence count + adaptive state) |
| `PUT /api/v1/learning/profile` | update goal, target JLPT, daily target, preferred registers / topics (null clears) |
| `POST /api/v1/learning/profile/refresh` | force profile synthesis now |
| `GET /api/v1/learning/today` | dashboard payload: session, focus (skills, JLPT band, trends), open recommendation |
| `POST /api/v1/learning/next` | build the next recommendation (generates + persists a matching exercise) |
| `GET /api/v1/learning/recommendation` | the current open recommendation (or `null`) |
| `GET /api/v1/learning/history` | paginated recommendation history |

## Gamification experience (Phase 7)

- **Deterministic XP ledger**: every rewarded event is a row in `xp_events` with a unique `(user_id, idempotency_key)`; `IntegrityError` on replay is swallowed so double-submits never double-award. Defaults: exercise completion 10 XP, first high score (≥80) 5 XP, retry improvement (≥5 points vs previous best) 5 XP, challenge completion 15 XP, daily goal 25 XP, milestone 50 XP, mission completion 0 XP. Levels cost `base * level` (base 100), all tunable via environment (`XP_*`).
- **Streaks**: timezone-aware (default `Asia/Ho_Chi_Minh`) consecutive-day tracking; a missed day resets the current streak (longest preserved); the whole streak engine can be toggled off from Settings (`streak_enabled` profile preference).
- **Daily goal**: matches the learner's `daily_target`; every evaluated attempt and successful challenge attempt counts. Completion awards 25 XP once and triggers the progress summary stage.
- **AI daily missions** (`daily_mission_generation:v1`): one mission per calendar day, lazily generated on first access, targeting a real profile weakness; completing a mission still returns the same mission (no new one is generated). A regenerate action archives the current mission and creates a new one. Missions track completion counts and never award XP themselves.
- **Challenges**: a `challenge_generation:v1` stage picks the challenge type deterministically (weakness-driven with recent-type rotation) and validates the AI content (required expressions, source text). Submitting an answer reuses the Phase 4 evaluation pipeline on the linked exercise; success is a deterministic function of the evaluation output (e.g. vocabulary challenges require the required expression or a natural inflection of it). A successful challenge awards 15 XP once, feeds the streak / daily goal / mission progress, extracts vocabulary into the bank, but never feeds the learner evidence profile.
- **Milestones** (`milestone_celebration:v1`): thresholds on exercises completed (5/10/25/50/100) and streak (7/30/90/365); reaching one awards 50 XP and an AI celebration message persisted with the milestone. Never AI-invented progress — only the real metric is shown.
- **Encouragement + progress summary** (`progress_summary:v1`, `encouragement:v1`): once per day, completing the daily goal persists an AI progress summary into the active learning session; encouragement fires once per day after a real improvement. Both are idempotent per day and fully isolated (failures never break the writing flow).
- **Fake provider**: implements all seven gamification AI stages deterministically so the whole layer runs offline in tests and demos.
- **UI**: the dashboard adds a progress card (level + XP bar, streak, today XP, daily goal bar), today's mission card, and an achievements list; the Practice page adds a challenge mode (shared ChallengePanel) and the dedicated Thử thách page hosts the same panel; Settings adds the streak toggle.

### Gamification endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/gamification/summary` | level, XP, streaks, today XP, daily goal |
| `GET /api/v1/gamification/xp/history` | paginated XP ledger |
| `GET /api/v1/gamification/today` | dashboard payload: summary, mission, focus, session summary, encouragement, reminders |
| `GET /api/v1/gamification/mission` | today's mission (lazily generated once per day) |
| `POST /api/v1/gamification/mission/regenerate` | archive the current mission and generate a new one |
| `GET /api/v1/gamification/milestones` | achieved milestones with celebrations |
| `POST /api/v1/challenges/generate` | create one challenge (AI + deterministic selection) |
| `GET /api/v1/challenges/{id}` | challenge detail |
| `POST /api/v1/challenges/{id}/attempts` | submit answer (Phase 4 evaluation + deterministic success criteria) |
| `GET /api/v1/challenges/{id}/attempts` | attempt history |

## Long-form writing & discourse intelligence (Phase 8)

- **Writing workspace**: the free-writing page becomes a full workspace. A draft (`POST /api/v1/writing/submissions`) creates a submission whose first revision is evaluated end-to-end; every subsequent `POST .../revisions` is a new immutable revision of the same submission. Each revision is persisted as a regular Phase 4 `ExerciseAttempt`, so vocabulary extraction, adaptive evidence and gamification hooks run unchanged (hooks are isolated — a failure never breaks the writing flow).
- **Two-stage evaluation**: the draft is split into sentences (deterministic segmentation, optional AI segmentation via `ai_long_form_ai_segmentation_enabled`) and each sentence runs the Phase 4 per-sentence evaluation pipeline (per-sentence scores + issues + hints). A discourse stage (`discourse_analysis:v1`) scores coherence, cohesion, organization, flow, style consistency and redundancy (weights configurable, default 25/20/15/20/10/10, must sum to 100), followed by structure suggestion (`structure_suggestion:v1`) and a synthesis stage (`discourse_synthesis:v1`) producing strengths, a summary and three meaning-preserving rewrites (minimal fix / natural / native).
- **Deterministic composite scores**: `sentence_quality` = weighted blend of per-sentence Phase 4 scores; `discourse_quality` = weighted blend of the six discourse dimensions; `overall_writing` = blend of the two via `ai_long_form_overall_sentence_weight` (default 50). Everything is persisted — reading an evaluation never re-triggers the AI.
- **Failure isolation**: if the discourse stage fails after retries, the evaluation returns `status: sentence_only`, `discourse_available: false` and overall = sentence quality; if the sentence pipeline itself fails, the endpoint returns 502 `evaluation_error`. The learner profile and planner are fully wired to the new evidence (5 discourse skills) and the planner nudges long-form/multi-sentence work toward discourse weaknesses.
- **Learning mode**: rewrites are hidden behind hints by default (`ai_exercise_learning_mode_enabled`). Deterministic, severity-ordered hints are revealed one at a time; after the last hint (or on demand via `POST .../reveal`) the three rewrites are shown. Hints are generated deterministically and never leak the final answer early.
- **Revision workflow**: `GET .../compare?from_revision=&to_revision=` diffs any two revisions (score deltas, added/removed/changed sentences) with optional AI guidance (`revision_guidance:v1`). An AI coach (`POST .../coach`) answers free-form questions using the learner profile and vocabulary bank (answer is bounded, never reveals chain-of-thought).
- **Persistence**: four new tables — `writing_submissions`, `writing_revisions` (one attempt each), `discourse_evaluations`, `discourse_issues`. Migration `20260818_c3f9a2d1b5e8` creates them.
- **UI**: the free-writing page renders the workspace — topic card, editor with character count, score header (overall + sentence/discourse quality), six discourse dimension bars, strengths, structure suggestion, per-sentence breakdown with clickable sentences, issues grouped by category (click to jump to the linked sentence), gated rewrites, revision timeline with compare view, and an AI coach side panel with preset questions.

### Writing endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/writing/submissions` | submit a draft (`exercise_id`, `text`, `mode: long_form`) → full evaluation (201) |
| `GET /api/v1/writing/submissions/{id}` | submission metadata + revision timeline |
| `GET /api/v1/writing/submissions/{id}/evaluation` | persisted evaluation of the latest revision (never re-runs AI) |
| `POST /api/v1/writing/submissions/{id}/revisions` | submit a revised draft → new revision + score deltas |
| `GET /api/v1/writing/submissions/{id}/compare` | diff two revisions (deltas, sentence diff, optional AI guidance) |
| `POST /api/v1/writing/submissions/{id}/hint` | reveal the next discourse hint |
| `POST /api/v1/writing/submissions/{id}/reveal` | reveal the three rewrites (idempotent) |
| `POST /api/v1/writing/submissions/{id}/coach` | ask the AI coach a question |

Errors: 400 `unsupported_exercise` (non long-form target), 400 `feature_disabled` (toggle off), 422 `validation_error` (too short / fewer than 2 sentences / over the sentence cap), 404 `not_found`, 502 `evaluation_error`.

## Real-world writing modes & AI scenario intelligence (Phase 9)

- **Scenario taxonomy**: a deterministic, metadata-driven taxonomy (`app/domain/scenario_formats.py`) defines 17 genres (business email, casual message, business chat, meeting follow-up, status/incident/bug report, requirement clarification, customer response, request, apology, proposal, opinion, SNS post, review, personal note, experience story), media, audiences, relationships, purposes, tones and registers, plus per-genre exercise types, target lengths and format-section templates. The AI only produces content; every dimension it returns is validated against the taxonomy and a bad plan triggers regeneration.
- **Scenario pipeline**: `POST /api/v1/scenarios/generate` runs plan → draft → validation (with cross-stage consistency checks, repeat-combination rejection and difficulty weighting) and persists a `writing_scenarios` row. `POST /api/v1/scenarios/{id}/exercise` materializes the linked exercise deterministically (no AI call); `/api/v1/scenarios/recent` lists scenarios with attempts for quick resume. Provider chain: scenario provider → learning provider → evaluation provider → generation provider.
- **Scenario-aware evaluation**: submitting a scenario-linked exercise (mode is auto-detected from `Exercise.scenario_id`) reuses the Phase 8 sentence + discourse pipeline and adds an isolated scenario stage scoring semantic fit, audience fit, purpose fit, tone fit and constraint compliance (deterministic `scenario_fit` blend 60/40 with discourse quality), plus a per-required-point checklist (`satisfied` / `partially_satisfied` / `missing`) and per-format-section results. Stage failure degrades to `scenario_unavailable=true` with the evaluation still returned. Scenario context feeds hints and the AI coach; a professional rewrite is produced only for professional genres (business/polite registers).
- **Adaptive integration**: learner evidence aggregates 5 scenario skills and per-genre strength; the planner gains a `scenario_practice` strategy that recommends scenario exercises for the learner's weakest genre (deterministic, difficulty/JLPT-clamped), surfaced as `scenario_genre` on recommendations.
- **Persistence**: `writing_scenarios` table with `required_points` / `optional_points` / `forbidden_patterns` / `difficulty_metadata` JSON columns; migration `20260818_a7e4b2c9d1f3`.
- **UI**: the Practice page adds a Tình huống mode — generate a scenario, review situation / context / required & optional points / forbidden patterns, and start writing (navigates to the free-writing workspace with `?exercise=&scenario=` query params, which load the exercise and scenario reminder). Writing results add a "Đánh giá theo tình huống" block (5 scenario dimension bars + overall fit chip), the required-point checklist, genre format-section checklist and the professional rewrite tab.
- **Tests**: `tests/test_scenario_service.py` (generation, preferences, taxonomy gates, validation/regeneration, repeat rejection, provider failures), `tests/test_scenario_discourse.py` (scenario stage, professional-rewrite gating, failure isolation, evaluation reconstruction, scenario hints) and `tests/test_learning_planner.py` (weak-genre detection + deterministic scenario plans); frontend tests cover the scenario mode flow, the query-param workspace and the scenario evaluation rendering.

### Scenario endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/scenarios/generate` | generate + persist a scenario (empty body = AI-selected); 400 `feature_disabled`, 502 `scenario_generation_error` |
| `GET /api/v1/scenarios/recent` | scenarios with at least one completed attempt (resume list) |
| `GET /api/v1/scenarios/{id}` | persisted scenario detail |
| `POST /api/v1/scenarios/{id}/exercise` | create the linked exercise (deterministic, no AI) |

## AI interactive writing simulation (Phase 10)

- **Session lifecycle**: `POST /api/v1/simulations` opens a simulated conversation around any existing scenario. The session is created with a deterministic `simulation_type` (derived from genre + audience + purpose in `app/domain/simulation_formats.py`, e.g. customer service, sales negotiation, meeting, office communication, casual chat), a register/JLPT/difficulty profile, a pressure condition (reflecting urgency, emotion and stakes from the scenario), a Vietnamese objective, an AI persona and a bounded `max_turns` budget. `GET /api/v1/simulations` lists history with average overall score; `GET /api/v1/simulations/{id}` reloads a session.
- **Conversation engine**: each user turn is evaluated through an isolated turn pipeline — scenario relevance, goal progress, communication effectiveness and naturalness (deterministic blends; naturalness requires the AI provider) — producing per-issue explanations and suggested fixes plus a three-tier correction chain (minimal fix / natural rewrite / native rewrite). The AI then advances the conversation according to a stage machine (`state.current_stage`, `unresolved_items`, `completed_items`, `participant_positions`, `facts`, `decisions`, `constraints`, `emotional_context`, `next_goal`) stored in the session. Submitting with `end_early=true` closes the session; sessions also complete automatically when the turn budget is exhausted. The open (`/turns/{id}/explain`) and coach (`/coach`) endpoints give learners deeper feedback on demand.
- **Two modes**: `guided` returns full per-turn evaluation to the client; `immersive` hides feedback client-side for a realistic conversation (the data is still persisted and surfaced in the summary).
- **Session summary**: `GET /api/v1/simulations/{id}/summary` synthesizes the whole session — Vietnamese narrative, dimension scores (overall / sentence quality / scenario fit / goal progress / communication effectiveness / naturalness), strengths, needs-work, resolution, turn count — with deltas against the learner's previous simulation of the same type. When a learner's turn scores below the naturalness threshold, a challenge is auto-generated via the existing challenge service and surfaced as `suggested_challenge` (isolated in a try/except; the summary still works if challenge generation fails).
- **Gamification integration**: ending a session awards XP (complete / objective-resolved / improved, +20/+10/+10, once per session) through the gamification hook and extends the daily streak; the hook runs on a plain snapshot to stay greenlet-safe and never raises.
- **Persistence**: `simulation_sessions` (profile, state machine, meta, summary) and `simulation_turns` (per-turn text + evaluation + corrections in the JSON `turn_metadata` column) and `simulation_evaluations` (issue rows); migration `20260818_fea5679e6ecd`.
- **AI integration**: a dedicated `simulation` provider chain (simulation provider → evaluation provider → fallback) drives opening/follow-up turns, evaluation, summaries and coaching; unconfigured environments degrade to the built-in `fake` provider, so the whole feature runs offline.
- **UI**: the new Mô phỏng page (`/simulation`) starts a conversation from a fresh or previously used scenario in guided or immersive mode, renders the chat thread with per-turn scores/issues/corrections and an explain button (guided only), a coach panel with presets, end-early + summary flow with dimension bars, strengths/needs-work, previous-session deltas and the suggested-challenge hint, and a recent-sessions sidebar for resume. The Practice page's Tình huống mode gains "Bắt đầu hội thoại mô phỏng" (navigates with `?scenario=`) and a per-scenario Hội thoại action.
- **Tests**: `tests/test_simulation_service.py` (session creation incl. deterministic type mapping, profile/pressure derivation, turn submission + stage advancement, evaluation + correction chains, end-early and budget completion, summary synthesis + comparison, challenge suggestion, coach and explain, error mapping), `tests/test_simulation_api.py` (router contract incl. feature gate), `tests/test_simulation_gamification.py` (XP/streak integration on the hook contract), plus the updated learner-evidence suite covering the simulation skills; frontend tests cover the setup/history view, the guided conversation flow with evaluation rendering, immersive hiding and the summary flow.

### Simulation endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/simulations` | create a simulation session (`scenario_id`, optional `mode`); 400 `feature_disabled`/`invalid_scenario_mode`, 404 `scenario_not_found` |
| `GET /api/v1/simulations` | list history (skip/limit) with average scores |
| `GET /api/v1/simulations/{id}` | reload a session; 404 `simulation_session_not_found` |
| `POST /api/v1/simulations/{id}/turns` | submit a turn (`text`, optional `end_early`); 404 missing session, 409 `session_inactive` when closed |
| `POST /api/v1/simulations/{id}/turns/{turn_id}/explain` | deep explanation for one user turn |
| `POST /api/v1/simulations/{id}/coach` | free-form coaching question about the session |
| `GET /api/v1/simulations/{id}/summary` | synthesize the session summary (works for active and closed sessions) |

## AI quality, evaluation & reliability intelligence (Phase 11)

- **Central quality layer** (`app/quality/`): every AI stage across all engines now routes through one shared pipeline — deterministic validation → quality policy → optional verifier → resolver → decision. The pipeline never raises for quality failures: it returns a `QualityOutcome` (state, decision, trust tier, violations, contradictions, fingerprint, metadata) and the engine decides how to react (regenerate, fallback, degrade).
- **Registry** (`app/quality/registry.py`): 25 tasks registered with per-task criticality, validator, policy and cost profile — semantic / grammar-vocabulary / naturalness-register / writing evaluation, exercise generation, vocabulary extraction, learner profile synthesis, learning planner, scenario generation & evaluation, discourse evaluation, simulation turn evaluation / state update / plan, memory extraction / validation / conflict detection, encouragement, daily mission, challenge generation, progress summary, and the Phase 13 curriculum tasks (goal interpretation, curriculum planning, curriculum replanning, objective progress analysis). Existing engine validators (evaluation consistency, discourse consistency, simulation state machine) are wrapped unchanged, so no rule is duplicated or loosened.
- **Decision vocabulary**: a result passes only on `ACCEPT`. Schema violations → `REJECTED` → `REGENERATE` within the `AI_QUALITY_MAX_RETRIES` budget → `DEGRADE`. Cross-field contradictions → `NEEDS_VERIFICATION` → `SECONDARY_VERIFY` (critical tasks with verification enabled) / `ESCALATE` / `DEGRADE`. Low confidence follows the same resolution chain, driven by configured thresholds (`AI_QUALITY_MIN_CONFIDENCE`, `AI_QUALITY_MAX_PROVIDER_DISAGREEMENT`) — never hard-coded in engines.
- **Engine integration**: raising gates where the registry rules match existing checks — evaluation (`evaluation_service.py`), discourse (`discourse_service.py`) and simulation (`simulation_service.py`) route through the quality layer and raise the engine's own consistency error, so the existing regeneration loops keep working unchanged. Exercise generation uses a loop-aware gate (a rejected draft simply triggers the next attempt). Vocabulary, learner profile, scenario, gamification, mission and challenge record validation outcomes as metadata without blocking the flow.
- **State-update integrity (requirement 35)**: `simulation_state_update` results must not silently drop or contradict facts / decisions from the previous state. A dropped fact is detected deterministically and repaired by re-merging the established values; anything still inconsistent degrades to the deterministic fallback (session state untouched), so a learner's conversation never loses established facts.
- **Prompt registry** (`app/prompts/registry.py`): 62 auditable entries mapping task → version, description, criticality, cost profile and output schema, built from the existing version constants so prompt provenance already persisted by every engine is not redefined. Exposed read-only in the diagnostics UI.
- **Privacy-safe telemetry** (`app/quality/telemetry.py`): in-memory rolling buffer (max 2000 events) recording task, provider, model, duration, success, failure class, retry count, fallback usage, token usage, quality status, result fingerprint and estimated cost — never API keys, learner content or prompts. Aggregated views (success rate, quality pass rate, latency, cost) feed the diagnostics API and UI; persisted events land in `ai_quality_events` when enabled. Cost estimation uses per-provider list prices (`app/quality/cost.py`) and is always labeled estimated.
- **Golden benchmark**: 107 JSON cases in `benchmark/golden/` across 13 categories (semantic, grammar/vocabulary, naturalness, writing, exercise, vocabulary, learner, scenario, discourse, simulation, gamification, memory, curriculum), including intentional negative cases the validators must reject. `BenchmarkExecutor` runs any case selection through the shared quality service and aggregates schema pass rate, consistency pass rate, expected-properties pass rate, semantic accuracy, naturalness agreement, latency and tokens. The CLI (`python scripts/run_benchmark.py --category simulation`) runs it offline with the `fake` provider; results persist in `ai_benchmark_runs` / `ai_benchmark_results` for regression comparison.
- **Persistence**: `ai_quality_events`, `ai_benchmark_runs` and `ai_benchmark_results` tables; migration `20260819_b1c3e5d7f9a2`.
- **Diagnostics UI**: the new Chất lượng AI page (`/ai-quality`) shows registry status (tasks + criticality + thresholds), telemetry aggregates, a golden-benchmark runner (category + limit, aggregate rates + per-case violations, persisted results) and the prompt registry. The page and all diagnostics endpoints return `404` in production and are hidden from navigation unless the backend confirms diagnostics are enabled (`AI_QUALITY_DIAGNOSTICS_ENABLED`).
- **Fake provider / offline**: the benchmark and every quality gate run fully deterministically, so the whole Phase 11 layer is exercised in tests and demos without any AI credentials.
- **Tests**: `tests/test_quality.py` (enums, registry, policy decisions, service states, telemetry, cost, fingerprint stability, privacy-safe metadata), `tests/test_benchmark.py` (golden dataset integrity, executor rates, positive/negative case detection, drop detection), `tests/test_prompt_registry.py` and `tests/test_quality_api.py` (status / telemetry / prompts, benchmark run + persisted results, `404`s, production gate); frontend tests cover the diagnostics page (registry / telemetry / prompts rendering, benchmark run flow, gated-unavailable notice).

### Quality & benchmark endpoints

All endpoints require `AI_QUALITY_DIAGNOSTICS_ENABLED=true` (default) and return `404` in production; none ever returns raw learner content.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/ai/quality/status` | registry summary: enabled, tasks, criticality, thresholds |
| `GET /api/v1/ai/quality/telemetry` | privacy-safe in-memory aggregates (tasks / providers / overall) |
| `GET /api/v1/ai/quality/prompts` | prompt registry (task, version, criticality, cost profile, output schema) |
| `POST /api/v1/ai/benchmark/run` | run the golden dataset (optional `categories` / `limit`, default provider) and persist the run |
| `GET /api/v1/ai/benchmark/{run_id}` | persisted run + aggregate rates |
| `GET /api/v1/ai/benchmark/{run_id}/results` | per-case persisted results |

## Personal AI memory & contextual tutor intelligence (Phase 12)

- **Persistent memory store** (`learner_memories`): category/type under a controlled taxonomy (preference, learning pattern, mistake pattern, successful pattern, vocabulary/expression/scenario/simulation memories, goals, style preference, milestones), confidence (high/medium/low), importance 1–10, occurrence count, evidence pointers, memory class (stable vs temporary with expiry), status (active / archived / expired) and source provenance (`user_explicit`, `evaluation`, `vocabulary`, `scenario`, `simulation`). Migration `20260819_c4a1f8e2d9b0`.
- **AI pipeline** (all stages schema-validated and routed through the Phase 11 quality layer): extraction proposes candidate memories from each learning event → validation accepts / rejects / merges / updates a candidate → conflict detection classifies a new vs existing memory (contradiction / refinement / contextual / preference change) → resolution applies deterministic rules. Code is authoritative: the AI proposes, deterministic logic enforces taxonomy, thresholds, deduplication, merging and resolution.
- **Deterministic resolution rules**: explicit user memories always win; contradiction → higher confidence wins (otherwise reinforce both); refinement → replace content; preference change → supersede + create; contextual → keep both. Nearly identical content (word overlap ≥ 0.8, same category/type) is always treated as the same memory and reinforced without an AI conflict call. Low importance/confidence candidates are rejected at the threshold (`AI_MEMORY_MIN_IMPORTANCE=4`, `AI_MEMORY_MIN_CONFIDENCE=medium`).
- **Ingestion sources**: exercise attempt evaluation, attempt vocabulary extraction, free-writing / scenario evaluations and simulation sessions. Every hook is best-effort (never raises) and sends only identifiers and scores to the AI — never raw learner text in telemetry; memory fingerprints are content-free.
- **Deterministic retrieval** (`DeterministicMemoryRetriever`): score = importance ×0.4 + confidence ×0.3 + recency ×0.15 + frequency ×0.15 + per-task category boost ×0.25, truncated by `max_items` and a token budget.
- **Contextual tutor intelligence**: a Vietnamese-labeled memory block is injected into the free-writing / discourse coach, the simulation coach, the learning planner, exercise generation, scenario generation and adaptive recommendations — so generated tasks and advice account for the learner's stored patterns, preferences and goals. A `memory_enabled` preference (default on) toggles ingestion; the UI can forget or archive any memory.
- **API** (`/api/v1/learning/memory`): list with filters (category / type / source / status), get, create (explicit, always wins), forget (204), archive, and `/refresh` to reprocess recent attempts + simulations and expire stale temporary memories. Settings exposes the toggle through the existing profile endpoint.
- **Quality integration**: memory extraction / validation / conflict detection are registered quality tasks with dedicated validators against the controlled taxonomy (categories, types, sources, confidence values, importance range, merge-with-id requirement, verdict vocabulary), fake-provider samples for offline runs, and 13 golden benchmark cases (`benchmark/golden/memory_*.json`).
- **Tests**: `tests/test_memory.py` (taxonomy, ingestion, rejection thresholds, resolution rules, retrieval ranking + budget, context block formatting, expiry, explicit-wins) and `tests/test_memory_api.py` (CRUD, archive, refresh, filters, profile toggle); frontend tests cover the Trí nhớ page (list, create, forget, archive, refresh, empty state), the settings toggle and the navigation entry.

## AI curriculum & learning journey engine (Phase 13)

- **Journey model**: one active journey per learner — `goal_type` (general / daily_conversation / business / it / brse / jlpt / natural_japanese / writing_fluency) → milestones (2–8, sequential unlock) → objectives (4–48, sequential unlock within each milestone). Every objective targets taxonomy competencies (`app/domain/curriculum_taxonomy.py`) and deterministic entry criteria: milestone 2+ requires `previous_milestone_completed`, objective 2+ requires `previous_objective_completed`. Only one objective is `active` at a time.
- **Deterministic progression**: mastery state (not_started → introduced → practicing → developing → proficient → mastered) and objective completion are ALWAYS computed in code from recorded evidence (attempts / simulations / missions / challenges), threshold `AI_CURRICULUM_DEFAULT_THRESHOLD` (default 80), `AI_CURRICULUM_MASTERY_ATTEMPTS` modes (default 2) and minimum attempts. The AI never decides progression — it only proposes titles, competencies, modes and success criteria (whitelisted ranges validated by `app/quality/curriculum_validators.py`; rejected plans fall back to a deterministic template plan).
- **AI planning** (`curriculum_planning:v1`): the AI builds a journey from the learner's memory block, profile and taxonomy competencies; `goal_interpretation:v1` derives the goal type from a free-text goal, `curriculum_explanation:v1` and `objective_progress_analysis:v1` produce learner-facing explanations. All five curriculum tasks route through the Phase 11 quality layer (goal interpretation, curriculum planning, curriculum replanning, objective progress analysis registered with validators; curriculum explanation runs through the same service). Unconfigured environments degrade to the built-in `fake` provider.
- **Evidence attribution**: exercise attempts, scenario exercises, simulations, daily missions and challenges each carry the active `objective_id`; their evaluations feed per-objective evidence (skills, scores, counts). Completing an objective awards 30 XP (`XP_OBJECTIVE_COMPLETE`), completing a milestone 75 XP and finishing a journey 200 XP — all once, via the idempotent XP ledger. Every curriculum hook is best-effort (try/except) and never breaks the host flow.
- **Replanning**: after `AI_CURRICULUM_REPLAN_INTERVAL` attempts with a low average, the engine triggers `curriculum_replanning:v1` (adjusting the remaining journey, isolating unchanged parts) — gated on confident evidence and applied only when the AI plan passes validation; a forced replan endpoint is also exposed. Replanning events are persisted for auditability.
- **Persistence**: `curriculum_journeys`, `curriculum_milestones`, `curriculum_objectives`, `curriculum_objective_progress`, `curriculum_plans`, `curriculum_replanning_events`; migration `20260819_d5e7f9a1b3c5`. `objective_id` columns added to `exercises`, `daily_missions`, `challenges`, `learning_recommendations`; `goal_type` added to `learner_profiles`; `curriculum_context` added to `user_vocabulary`.
- **UI**: the new Lộ trình page (`/journey`) creates/regenerates a journey by goal type and renders the milestone timeline with per-objective mastery bars and explanations; the dashboard adds a journey card (progress %, current objective); settings adds a goal-type selector (changing it regenerates the journey); the practice page's recommended mode shows an objective banner with the current milestone, competencies and progress. All journey UI strings are Vietnamese.
- **Tests**: `tests/test_objective_mastery.py` (16: state machine, entry criteria, clamp/aggregation, evidence thresholds, XP keys) and `tests/test_curriculum_journey.py` (10: fallback vs AI plans, coverage validation, evidence → journey completion loop, stagnation triggers, forced replan, API contract) — full API suite 701 passed / 8 skipped; frontend `JourneyPage.test.tsx` covers create/regenerate/milestones/mastery labels.
- **Benchmark**: 8 golden curriculum cases (`benchmark/golden/curriculum.json`) covering all five curriculum tasks with positive and negative examples; `tests/test_benchmark.py` enforces schema and expected-properties pass rates across the whole dataset.

### Journey endpoints (mounted under `/api/v1/learning`)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/learning/journey` | journey status: milestones, objectives, per-objective progress, current objective (or `null`) |
| `POST /api/v1/learning/journey` | create (or `force_regenerate`) a journey for `goal_type` |
| `GET /api/v1/learning/journey/objective/context` | active objective context (title, milestone, competencies, suggested modes, progress) for banners |
| `GET /api/v1/learning/journey/objective/evidence` | paginated evidence rows for the active objective |
| `POST /api/v1/learning/journey/replan` | request replanning (body = requested changes) |
| `GET /api/v1/learning/journey/objectives/{id}/explanation` | learner-facing explanation for one objective |

## Product intelligence, learning analytics & optimization (Phase 14)

- **Feature effectiveness**: `analytics` module computes per-feature effectiveness from recorded evidence — scenario genres (user usefulness from completion/improvement/engagement minus failure/skip, clamped 0–100), simulation sessions (topic pass/fail), curriculum (per-objective outcomes, 0–100), recommendations (completion of the recommended exercise), difficulty calibration (avg score + completion rate per difficulty level with `too_easy` / `too_hard` / `appropriate` / `mixed` verdicts), vocabulary (coverage by JLPT level) and memory (usage in later generations). Effectiveness rows carry `insufficient_evidence` when the sample is below `analytics_min_evidence` (default 2) so the UI never over-interprets sparse data.
- **Learning outcomes**: 12 skill outcomes (6 writing skills from `WritingFeedback` scores, 5 discourse skills from `DiscourseEvaluation`, `communication_effectiveness` from simulations) are bucketed into a baseline (first half of the window) vs. current (second half); deltas drive the trend (`up` / `down` / `stable`). Windows are `7d` / `14d` / `30d` / `90d` / `all_time`; the window end carries a 24 h slack so rows written "now" are never excluded.
- **AI & cost analytics**: per-task and per-provider telemetry (calls, success rate, quality pass rate, latency, fallback rate, prompt version) plus estimated cost roll-ups (`overview`, `cost_by_provider`, `cost_by_task`) — read-only over existing analytics events, never invasive.
- **Recommendations & A/B experiments**: `analysis:v1` (fake provider by default) inspects the evidence buckets and emits observations (single-side evidence, `insight`/`reassurance`) and comparisons (baseline vs. current, `improved` / `regressed` / `unchanged`), each with a priority and an action; recommendations persist with a review lifecycle (`pending` → `accepted` / `rejected` / `implemented`) and a decision endpoint (verbs mapped to canonical statuses). Experiments persist a control vs. variant config (allocation 1–99 %, metrics list), deterministic user assignment into arms, per-metric comparisons (deltas with `insufficient_evidence` gating) and a winner analysis; the analyzer only accepts confidence `medium`+ and surfaces the winner, otherwise it leaves the experiment undecided.
- **Persistence & gating**: analytics events are recorded via per-domain best-effort hooks on the existing attempt/simulation/memory/vocabulary/generation flows; tables `analytics_events`, `analytics_recommendations`, `analytics_recommendation_evidence`, `analytics_experiments`; migration `20260819_f1a3c5e7d9b1`. The analytics API is environment-gated (only `learner-summary` is always available) — in production the endpoints 404 and the frontend hides the entry point, mirroring the Phase 11 diagnostics gating.
- **UI**: the new Phân tích page (`/analytics`) offers a window selector and renders activity chips (active days, attempts, evaluations, simulations, memories, objectives…), the 12-skill profile grid with deltas/trends and insufficient-evidence badges, learning outcomes, difficulty calibration table, conversion funnel, AI telemetry + cost tables, feature effectiveness, the recommendation queue with accept/reject/implement actions, a "run analysis" button with insights, a recommendation draft form and the A/B experiment list (metrics, assign me, analyze). The dashboard gains a "Tiến bộ tháng này" card (average skill score, strongest/weakest skills, link to the analytics page). All UI strings are Vietnamese.
- **Tests**: backend `tests/test_analytics_*.py` (44 tests: window resolution incl. the UTC slack, exercise usefulness math, scenario genre grouping, calibration verdicts, provider cost roll-ups, funnel stages, experiments lifecycle incl. metrics/assign/winner analysis, aggregation SQL, product analysis incl. the memory-context recommendation evidence and API contract incl. decisions and gating) — full API suite 745 passed / 8 skipped; frontend `AnalyticsPage.test.tsx` (overview + skills + calibration + funnel, window switching refetch, gated 404 notice, analysis insights, recommendation decision, experiment metrics) and the dashboard progress-card test.

## Production hardening & final polish (Phase 15)

- **Backend data integrity**: singleton resources are now race-safe — IntegrityError from a concurrent duplicate write rolls back and refetches the winning row (memory `_create`, mission `_generate`, mistake `_upsert`, recommendation `_persist_recommendation`). The DB enforces the invariants independently: migration `20260819_b6d8f0a2c4e6` adds the 5 missing foreign keys and unique backstops via VIRTUAL generated columns (MySQL has no partial indexes; STORED breaks FK rules) for one-active-memory, one-active-mission, one-active-recommendation, mistake-pattern and vocabulary-discovery uniqueness. Applied to the production database (head, 55 FKs, no duplicates). Four dedicated race tests in `tests/test_integrity_races.py`.
- **Backend security** (`app/core/security.py`): request correlation IDs (`X-Request-ID` echoed or generated, exposed as `current_request_id()` for log correlation) with one access-log line per request; security headers (nosniff, frame denial, no-referrer, permissions policy, CSP `default-src 'none'`, HSTS in production); in-process per-IP fixed-window rate limiting (300/min default, configurable, `/health*` + OPTIONS/HEAD exempt, 429 with Retry-After). OpenAPI docs are disabled in production. `POST` validation errors no longer echo the request body (`app/core/errors.py`). AI-provider transport errors are redacted and truncated before logging (`app/providers/ai/redaction.py`). `/health/live` (liveness) and `/health/ready` (readiness, DB check, 503 on failure) added; `/health` preserved.
- **Frontend polish**: route-level code splitting (all pages lazy except Dashboard, `vendor-react` chunk), strict TypeScript in both tsconfigs, `X-Request-ID` on every API call (`ApiError.requestId`), responsive layout at 900px/480px breakpoints, free-writing draft autosave to localStorage (debounced, per exercise), retryable error boundaries per route, memoized navigation, production CSP meta tag injected at build, config fallback to `window.location.origin`, and a UTF-16-safe character counter.
- **CI & docs**: `.github/workflows/ci.yml` runs MySQL-backed backend tests + alembic upgrade and the full frontend pipeline on push/PR. Whole-tree lint debt fixed (ruff clean, formatted). Phase 15 report: `docs/PHASE15-REPORT.md`; logging guide: `docs/logging.md`.

## Writing intelligence foundation (Phase 16)

- **Persistent weakness store** (`writing_weaknesses`): maps specific recurring learner writing errors with taxonomy-backed categorization across 5 dimensions (`grammar`, `vocabulary`, `naturalness`, `register`, `discourse`), subtypes (e.g. particles, transitivity, collocations, false friends, katakana/wasei, direct Vietnamese translations, nuance mismatch, keigo formality, sentence boundary, cohesion), severity (`critical`, `major`, `minor`), affected registers, JLPT levels, and real submitted examples. Migration `20260823_writing_intelligence.py`.
- **5-dimensional writing fingerprint**: aggregates active, recurring, and mastered weaknesses, dimension scores, mastery rate, and strongest/weakest areas from all past evaluations.
- **AI comprehensive diagnosis** (`writing_diagnosis:v1`): analyzes recurring patterns, strengths, priority focus areas, and actionable recommendations in Vietnamese with built-in deterministic fallback when offline.
- **UI**: Studio Trí Tuệ Viết page (`/intelligence`) with interactive 5-dimension radar/score cards, category filters, weakness search, and Dashboard integration widget (`WritingIntelligenceWidget`).

### Writing intelligence endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/writing/intelligence/profile` | full writing fingerprint and profile summary |
| `GET /api/v1/writing/intelligence/weaknesses` | paginated/filtered list of tracked weaknesses |
| `GET /api/v1/writing/intelligence/summary` | dashboard summary of active/recurring weaknesses |
| `POST /api/v1/writing/intelligence/diagnose` | trigger AI writing diagnosis synthesis |

## Persistent error & mastery engine (Phase 17)

- **Error lifecycle state machine**: 7-state deterministic lifecycle (`NEW` → `OBSERVED` → `RECURRING` → `TARGETED` → `IMPROVING` → `STABLE` → `MASTERED`) adhering to the core principle that a single correction is not learning; writing weaknesses only decrease upon demonstrated correct usage repeatedly across diverse contexts and delayed intervals.
- **Regression engine**: when an error previously marked `MASTERED` recurs in a new submission, the system automatically demotes it to `RECURRENT` (`status = "regressed"`) and triggers immediate delayed retesting.
- **Evidence-based multi-factor mastery scoring**: computed via deterministic weighted formula combining correct-use ratio (30%), context generalization diversity (25%), free writing success rate (20%), register diversity (15%), and staleness/recency (10%). Evaluated across 6 writing contexts (`sentence_translation`, `rewrite`, `scenario_writing`, `simulation`, `free_writing`, `unseen_context`). Single drill format exercises cannot achieve mastery alone.
- **Delayed retest scheduler**: automatically schedules spaced intervals (`+1d` short check, `+2d` different context, `+7d` free writing test, `+14d` real-world simulation) stored in `retest_due_at` and `retest_interval_days`.
- **AI mastery narrative** (`weakness_mastery_narrative:v1`): synthesizes learner-friendly 4-part guidance (why it matters, current mastery, context evidence, next retest schedule) without intimidating mathematical jargon, backed by deterministic Vietnamese fallback.
- **Adaptive learning planner integration**: `AdaptiveLearningService` and `LearnerProfileService` automatically prioritize generated exercises for due retests.
- **Persistence**: columns `lifecycle_state`, `correct_count_by_context`, `incorrect_count_by_context`, `context_generalization_score`, `register_diversity_score`, `last_correct_at`, `last_incorrect_at`, `days_since_last_error`, `retest_due_at`, `retest_interval_days`, `retest_passed_count`, `mastery_evidence`, `mastery_history`, `mastery_narrative`, `narrative_generated_at`; migration `20260824_mastery_engine.py`.
- **UI**: Writing Intelligence page tab "Ôn tập đến hạn", 7-state lifecycle badges (`Cần ôn lại`, `Lịch ôn tập`, `Mục tiêu`), and narrative cards.

### Mastery & retest endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/writing/intelligence/retests/due` | list weaknesses due for delayed retest |
| `GET /api/v1/writing/intelligence/evidence/summary` | context generalization and lifecycle state distribution summary |
| `GET /api/v1/writing/intelligence/weaknesses/{id}/detail` | weakness detail with evidence and AI narrative |
| `GET /api/v1/writing/intelligence/weaknesses/{id}/mastery` | mastery state and component score breakdown |
| `GET /api/v1/writing/intelligence/weaknesses/{id}/history` | full state-transition audit history |
| `POST /api/v1/writing/intelligence/weaknesses/{id}/narrative` | generate on-demand AI mastery narrative |

## Requirements

- Python 3.10+
- Node.js 20+ (npm)
- MySQL 8.0 running locally
- Git

## Local setup

### 1. Backend

```powershell
cd apps/api
python -m venv .venv                  # create virtual environment (never install globally)
.\.venv\Scripts\Activate.ps1          # activate it
python -m pip install -r requirements-dev.txt   # runtime + test/lint tooling
Copy-Item .env.example .env           # then edit values as needed
```

### 2. Database

Create the databases (once):

```powershell
cd apps/api
python scripts/create_databases.py    # creates ai_japanese_writing and ai_japanese_writing_test
```

Run migrations:

```powershell
python -m alembic upgrade head
```

### 3. Frontend

```powershell
cd apps/web
npm install
Copy-Item .env.example .env
```

## Targeted Writing Drill Engine (Phase 18)

- **Purpose**: Transforms learner-specific writing weaknesses (`WritingWeakness`) into highly targeted 4-stage practice sessions. The engine strictly avoids generic exercises when a tracked weakness is available.
- **8 Supported Drill Types**:
  1. `recognition`: identify correct particles/forms among distractors with immediate rationale.
  2. `correction`: fix specific erroneous segments in a flawed sentence.
  3. `rewrite`: rewrite a sentence using targeted grammar patterns or tone constraints.
  4. `vietnamese_to_japanese`: targeted translation highlighting focus particles/collocations.
  5. `japanese_to_natural_rewrite`: transform unnatural/literal phrasing into native natural Japanese.
  6. `pattern_substitution`: substitute words/phrasings into target sentence templates.
  7. `free_response`: unassisted production in a novel situation requiring the target structure.
  8. `real_world_mini_task`: practical communication (email opening, decline message, business request).
- **Adaptive Drill Selection Matrix**: Maps weakness `(category, subtype)` to a tailored 4-drill sequence:
  - *Grammar / Particles / Conjugation*: `recognition` → `pattern_substitution` → `correction` → `vietnamese_to_japanese`.
  - *Lexicon / Collocation*: `recognition` → `pattern_substitution` → `vietnamese_to_japanese` → `free_response`.
  - *Naturalness / Literal Translation*: `vietnamese_to_japanese` → `japanese_to_natural_rewrite` → `rewrite` → `free_response`.
  - *Register / Keigo*: `recognition` → `rewrite` → `pattern_substitution` → `real_world_mini_task`.
  - *Discourse / Coherence*: `recognition` → `rewrite` → `pattern_substitution` → `free_response`.
- **Dynamic 4-Stage Scaffolding**:
  - *Stage 1 (Heavy Guidance)*: Sentence blueprints/scaffolds, keyword hints, multiple-choice options.
  - *Stage 2 (Light Guidance)*: Partial sentence templates and subtle clue hints.
  - *Stage 3 (Minimal Guidance)*: Translation or rewrite constraint with progressive hint unlocks.
  - *Stage 4 (No Guidance)*: Open-ended production in a novel transfer context.
- **Intelligent Nuance Evaluation & AI Debrief**:
  - Semantic evaluation with nuance contrast (`nuance_contrast`) explaining *why* a phrasing is natural or unnatural.
  - Pedagogical wrap-up debrief with mastery delta (`mastery_delta`) attributed directly into `WritingWeakness` and `WritingMasteryEngine`.
- **Spaced Retest & Due Drills**: Surfaces high-priority drills for overdue retests and persistent recurring errors.

### Writing Drill endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/writing/drills/generate` | Generate a 4-stage targeted drill session for a weakness or priority area |
| `GET /api/v1/writing/drills/due` | List due retests and high-priority weaknesses ready for drill practice |
| `GET /api/v1/writing/drills/{id}` | Get active drill session state and items |
| `POST /api/v1/writing/drills/{id}/attempt` | Submit attempt for current item, run AI evaluation, update state |
| `POST /api/v1/writing/drills/{id}/hint` | Progressive hint reveal for current item |
| `POST /api/v1/writing/drills/{id}/reveal` | Reveal target answer and pedagogical explanation |
| `GET /api/v1/writing/drills` | List drill session history with filter by status or weakness |

## Environment configuration

Backend (`apps/api/.env`):

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | `development` / `production` / `test` | `development` |
| `APP_DEBUG` | enable debug mode | `false` |
| `DATABASE_URL` | MySQL async SQLAlchemy URL | `mysql+aiomysql://root@localhost:3306/ai_japanese_writing` |
| `CORS_ORIGINS` | comma-separated allowed origins | `http://localhost:5173` |
| `LOG_LEVEL` | logging level | `INFO` |
| `AI_DEFAULT_PROVIDER` | default AI provider name (`fake`, `gemini`, `groq`, `ollama`) | `fake` |
| `AI_DEFAULT_MODEL` | optional default model override for the default provider | _(empty)_ |
| `AI_MAX_RETRIES` | retries for transient provider failures | `2` |
| `AI_REQUEST_TIMEOUT` | per-provider request timeout (seconds) | `60` |
| `AI_RETRY_BACKOFF` | exponential backoff base (seconds) | `1` |
| `AI_FALLBACK_PROVIDERS` | comma-separated fallback providers, tried after retries are exhausted | _(empty)_ |
| `AI_EXERCISE_GENERATION_PROVIDER` | AI provider for exercise generation (falls back to `AI_DEFAULT_PROVIDER`) | `fake` |
| `AI_EXERCISE_GENERATION_MODEL` | model for exercise generation | _(empty → provider default)_ |
| `AI_EXERCISE_GENERATION_MODEL_PLANNER` | optional model override for the planner stage | _(empty)_ |
| `AI_EXERCISE_GENERATION_MODEL_GENERATOR` | optional model override for the generator stage | _(empty)_ |
| `AI_EXERCISE_GENERATION_MODEL_VALIDATOR` | optional model override for the validator stage | _(empty)_ |
| `AI_EXERCISE_MAX_REGENERATION_ATTEMPTS` | generator retries when validation rejects a draft | `1` |
| `AI_EXERCISE_RECENT_PROMPT_WINDOW` | how many recent exercises are checked for near-duplicates | `100` |
| `AI_EXERCISE_NEAR_DUPLICATE_THRESHOLD` | similarity ratio above which a prompt is a near-duplicate | `0.88` |
| `AI_EXERCISE_EVALUATION_PROVIDER` | AI provider for evaluation (falls back to generation provider, then `AI_DEFAULT_PROVIDER`) | _(empty)_ |
| `AI_EXERCISE_EVALUATION_MODEL` | model for evaluation stages | _(empty → provider default)_ |
| `AI_EXERCISE_EVALUATION_MODEL_SEMANTIC` | per-stage model overrides (`_GRAMMAR`, `_NATURALNESS`, `_CORRECTION`, `_HINT`) | _(empty)_ |
| `AI_EXERCISE_EVALUATION_MAX_RETRIES` | extra pipeline cycles when consistency validation rejects a result | `2` |
| `AI_EXERCISE_EVALUATION_MAX_TOKENS` | max output tokens per evaluation stage | `1024` |
| `AI_EXERCISE_LEARNING_MODE_ENABLED` | hide corrections until hints are exhausted or the answer is revealed | `true` |
| `AI_EXERCISE_EVALUATION_VERIFICATION_ENABLED` | run the extra verifier stage after corrections | `false` |
| `AI_EVALUATION_WEIGHT_SEMANTIC` | synthesis weights (`_GRAMMAR` `_VOCABULARY` `_NATURALNESS` `_CONTEXT_FIT` `_REGISTER_FIT`; normalized when the sum ≠ 100) | `25` / `20` / `10` / `30` / `10` / `5` |
| `GEMINI_API_KEY` | Google Gemini API key | _(empty)_ |
| `GEMINI_DEFAULT_MODEL` | default Gemini model | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Groq API key | _(empty)_ |
| `GROQ_DEFAULT_MODEL` | default Groq model | `llama-3.3-70b-versatile` |
| `OLLAMA_BASE_URL` | local Ollama server URL | _(empty → 127.0.0.1:11434)_ |
| `OLLAMA_DEFAULT_MODEL` | default Ollama model | `llama3.2` |
| `AI_LEARNING_PROVIDER` | AI provider for learning stages (falls back to `AI_DEFAULT_PROVIDER`) | _(empty)_ |
| `AI_LEARNING_MODEL` | model for learning stages (`AI_LEARNING_PROFILE_MODEL` for synthesis only) | _(empty → provider default)_ |
| `AI_LEARNING_MAX_TOKENS` | max output tokens per learning stage | `1024` |
| `AI_LEARNING_STRATEGY_TARGETED` | strategy mix (`_REINFORCEMENT` `_EXPLORATION`; must sum to 100) | `70` / `20` / `10` |
| `AI_LEARNING_PROFILE_REFRESH_INTERVAL` | evaluations between profile re-syntheses | `10` |
| `AI_LEARNING_MAX_DIFFICULTY_STEP` | max difficulty step away from the learner's level per recommendation | `2` |
| `AI_LEARNING_MAX_JLPT_STEP` | max JLPT step away from the learner's level per recommendation | `1` |
| `AI_LEARNING_RECENCY_HALF_LIFE_DAYS` | recency half-life for evidence weighting | `30` |
| `AI_LEARNING_EVIDENCE_WINDOW` | max evaluations included in the evidence summary | `200` |
| `AI_LEARNING_AUTO_UPDATE_ENABLED` | update learner state automatically after each submission | `true` |
| `GAMIFICATION_ENABLED` | enable the gamification hook after submissions | `true` |
| `XP_EXERCISE_COMPLETE` | XP per evaluated exercise attempt | `10` |
| `XP_HIGH_SCORE_BONUS` | XP for a first high score (≥ `XP_HIGH_SCORE_THRESHOLD`) | `5` |
| `XP_RETRY_IMPROVEMENT` | XP for improving at least `XP_RETRY_IMPROVEMENT_DELTA` points over the previous best | `5` |
| `XP_CHALLENGE_COMPLETE` | XP for a successful challenge | `15` |
| `XP_DAILY_GOAL` | XP for completing the daily goal | `25` |
| `XP_MILESTONE` | XP per reached milestone | `50` |
| `XP_MISSION_COMPLETE` | XP per completed mission | `0` |
| `XP_HIGH_SCORE_THRESHOLD` | score needed for the high-score bonus | `80` |
| `XP_RETRY_IMPROVEMENT_DELTA` | minimum improvement for the retry bonus | `5` |
| `XP_LEVEL_BASE` | level cost base (level L→L+1 costs `base * L`) | `100` |
| `AI_CHALLENGE_ENABLED` | enable AI challenge generation (fallback templates otherwise) | `true` |
| `AI_DAILY_MISSION_ENABLED` | enable AI daily missions | `true` |
| `AI_PROGRESS_SUMMARY_ENABLED` | enable the daily progress summary stage | `true` |
| `AI_ENCOURAGEMENT_ENABLED` | enable the daily encouragement stage | `true` |
| `AI_CHALLENGE_FREQUENCY` | challenges every N evaluated attempts | `3` |
| `AI_CHALLENGE_SUCCESS_THRESHOLD` | score needed for challenge success | `80` |
| `AI_GAMIFICATION_PROVIDER` | provider for gamification AI stages (falls back to the learning / evaluation / default chain) | _(empty)_ |
| `AI_GAMIFICATION_MODEL` | model for gamification stages (`AI_DAILY_MISSION_MODEL`, `AI_CHALLENGE_MODEL`, `AI_PROGRESS_SUMMARY_MODEL`, `AI_MILESTONE_MODEL`, `AI_ENCOURAGEMENT_MODEL` for individual stages) | _(empty — provider default)_ |
| `AI_GAMIFICATION_MAX_TOKENS` | max output tokens per gamification AI stage | `1024` |
| `AI_QUALITY_MIN_CONFIDENCE` | minimum confidence for direct acceptance (`low` / `medium` / `high`) | `medium` |
| `AI_QUALITY_MAX_PROVIDER_DISAGREEMENT` | provider-disagreement threshold that triggers resolution | `25` |
| `AI_QUALITY_MAX_RETRIES` | regeneration budget for rejected results | `2` |
| `AI_QUALITY_VERIFICATION_ENABLED` | run the optional AI verifier pass for critical tasks | `false` |
| `AI_QUALITY_ESCALATION_ENABLED` | allow escalation of unresolved (contradictory / low-confidence) results | `true` |
| `AI_QUALITY_DIAGNOSTICS_ENABLED` | enable quality/benchmark endpoints + frontend dashboard (always `404` in production) | `true` |
| `AI_QUALITY_TELEMETRY_ENABLED` | record privacy-safe telemetry events | `true` |
| `AI_QUALITY_VERIFICATION_PROVIDER` | provider for the verifier stage (falls back to the quality chain) | _(empty)_ |
| `AI_QUALITY_VERIFICATION_MODEL` | model for the verifier stage | _(empty)_ |
| `AI_QUALITY_ESCALATION_MODEL` | model for escalation prompts | _(empty)_ |
| `AI_QUALITY_EVIDENCE_MIN_COUNT` | minimum evidence count before secondary verification is meaningful | `3` |
| `AI_QUALITY_EVIDENCE_MAX_CONTAMINATION` | maximum tolerated contamination ratio for verification evidence | `0.3` |
| `AI_QUALITY_COST_PROFILES` | per-task cost-profile overrides (`task:profile,task:profile,...`) | _(empty)_ |
| `AI_CURRICULUM_ENABLED` | enable the curriculum / journey engine hooks | `true` |
| `AI_CURRICULUM_PROVIDER` | provider for curriculum AI stages (falls back to the learning / evaluation / default chain) | _(empty)_ |
| `AI_CURRICULUM_MODEL` | model for curriculum stages (`AI_CURRICULUM_PLANNING_MODEL`, `AI_CURRICULUM_REPLANNING_MODEL`, `AI_CURRICULUM_EXPLANATION_MODEL` for individual stages) | _(empty — provider default)_ |
| `AI_CURRICULUM_MAX_TOKENS` | max output tokens per curriculum AI stage | `1536` |
| `AI_CURRICULUM_REPLAN_INTERVAL` | attempts per objective before stagnation replanning is evaluated | `25` |
| `AI_CURRICULUM_EVIDENCE_WINDOW` | max evidence rows used per objective | `50` |
| `AI_CURRICULUM_MASTERY_ATTEMPTS` | distinct modes required for mastery | `5` |
| `AI_CURRICULUM_MIN_EVIDENCE_CONFIDENT` | evidence count before a stagnation signal is confident | `3` |
| `AI_CURRICULUM_DEFAULT_THRESHOLD` | default mastery threshold (AI may propose 50–95) | `80` |
| `AI_CURRICULUM_MAX_MILESTONES` | max milestones per journey | `8` |
| `AI_CURRICULUM_MAX_OBJECTIVES_PER_MILESTONE` | max objectives per milestone | `6` |
| `XP_OBJECTIVE_COMPLETE` | XP for completing a journey objective | `30` |
| `XP_MILESTONE_COMPLETE` | XP for completing a journey milestone | `75` |
| `XP_JOURNEY_COMPLETE` | XP for completing a whole journey | `200` |

Frontend (`apps/web/.env`):

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | backend base URL | `http://localhost:8000` |

`.env` files are git-ignored. `DATABASE_URL` must use the `mysql+aiomysql` scheme and must never be committed.

## Development commands

Backend (from `apps/api`, with venv activated):

```powershell
python -m uvicorn app.main:app --reload    # start API at http://localhost:8000
```

Frontend (from `apps/web`):

```powershell
npm run dev                          # start Vite dev server at http://localhost:5173
```

## Testing commands

Backend (from `apps/api`, with venv activated; requires the `ai_japanese_writing_test` database, created by the setup script):

```powershell
pytest
```

Frontend (from `apps/web`):

```powershell
npm test
```

## Code quality commands

Backend:

```powershell
ruff check .
ruff format --check .
```

Frontend:

```powershell
npm run lint
npm run typecheck
```

## Self-Correction & Rewrite Lab (Phase 19)

Phase 19 delivers an intelligent self-correction and sentence transformation laboratory (`RewriteLabSession`), designed under the pedagogical principle that **the AI should not immediately rewrite the learner's sentence; the learner must attempt self-correction first**.

### 1. 6-Step Review Ladder (Zero-Leakage Review Pipeline)
- **Step 1 — Issue Detection**: Pinpoints grammatical, lexical, register, or naturalness issues in submitted Japanese sentences.
- **Step 2 — Category Explanation (Zero Answer Leakage)**: Explains the underlying linguistic category in Vietnamese without revealing the target answer or vocabulary.
- **Step 3 — Learner Attempt #1**: The learner attempts to recognize and fix the error independently.
- **Step 4 — Clue Reveal**: If the first attempt is incorrect, provides a thought-provoking clue (`clue`).
- **Step 5 — Pattern & Example Formulation**: If still incorrect, provides an abstract formula and structural example (`pattern`).
- **Step 6 — Controlled 4-Way Reveal**: Only after all attempts are exhausted (or explicitly requested) does the system reveal the 4-way comparison variants:
  - **A. Original**: Learner's initial sentence.
  - **B. Minimal Correction**: Grammar/particle fixes keeping maximum original vocabulary.
  - **C. Natural Japanese**: Idiomatic, native-like phrasing.
  - **D. Formal/Business Alternative**: Polished Keigo / business correspondence variant.
- **Anti-Copy-Paste Requirement**: Demands the learner write a new synthesis sentence (`synthesis_prompt_vi`) applying the learned pattern before completing the stage.

### 2. 6 Transformation Modes (Rewrite Modes Workspace)
1. **Minimal Correction (`minimal`)**: Fixes grammar and particles while preserving original wording.
2. **Naturalization (`natural`)**: Eliminates redundant pronouns, leverages natural nominalizers, and improves flow.
3. **Register Conversion (`register`)**: Transforms between Casual, Polite (Desu-Masu), and Business Keigo.
4. **Concision (`concision`)**: Trims padding words and verbose phrasing into crisp expression.
5. **Expansion (`expansion`)**: Enriches the sentence with vivid adverbs, sensory details, and reasoning.
6. **Native Alternative (`native`)**: Utilizes authentic Japanese idioms, onomatopoeia, and collocations.

### 3. Linguistic Diff & Grammatical Reasoning
- Token/chunk-level diff analyzer (`chunks: [insert | delete | replace | equal]`).
- Detailed Vietnamese grammatical rationales for each modification.
- Quality delta score (`quality_delta`) and improvement status (`significantly_improved`, `improved`, `partially_improved`, `regressed`, `unchanged`).

### 4. Transfer Check Arena
- Generates a completely novel real-world scenario testing whether the learner can generalize and apply the target pattern to a new context.
- Evaluates transfer accuracy, pattern mastery, strengths, and provides reference exemplar sentences.

### 5. Socratic AI Writing Coach
- Interactive dialogue pane that references the learner's active session, diagnosed weaknesses, and past failed attempts.
- Uses the Socratic method to guide the learner toward understanding root principles rather than spoon-feeding answers.

### Rewrite Lab Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/rewrite-lab/sessions` | Create a new self-correction session with zero-leakage issue diagnosis |
| `GET /api/v1/rewrite-lab/sessions/{id}` | Get session state, ladder step, clues, and history |
| `POST /api/v1/rewrite-lab/sessions/{id}/attempts` | Submit learner self-correction attempt (evaluates quality delta & ladder advance) |
| `POST /api/v1/rewrite-lab/sessions/{id}/reveal` | Reveal 4-way comparison variants (Original / Minimal / Natural / Business) |
| `POST /api/v1/rewrite-lab/sessions/{id}/transfer-task` | Generate novel scenario transfer task for the session's target concept |
| `POST /api/v1/rewrite-lab/sessions/{id}/transfer-attempt` | Evaluate learner transfer sentence submission |
| `POST /api/v1/rewrite-lab/transform-mode` | Transform sentence across 6 rewrite modes with target register support |
| `POST /api/v1/rewrite-lab/diff-explain` | Perform linguistic chunk diff and provide grammatical reasoning |
| `POST /api/v1/rewrite-lab/socratic-coach` | Query the Socratic writing tutor with context and weakness awareness |

## Real-World Writing Mission System (Phase 20)

Phase 20 delivers a comprehensive **Real-World Writing Mission System**, designed to make Japanese writing practice directly transferable to real life without generic static content libraries or word-by-word translation dependency.

### 1. Real-World Categories & Action Taxonomy (4 Categories, 23 Practical Actions)
- **DAILY LIFE (Đời sống)**: Making plans (`making_plans`), Cancelling/changing plans (`cancelling_plans`), Asking for help (`asking_for_help`), Explaining a problem (`explaining_problem`), Apologizing (`apologizing`), Making a request (`making_request`).
- **WORK (Công sở & Doanh nghiệp)**: Progress update (`progress_update`), Asking a colleague (`asking_colleague`), Reporting a problem (`reporting_problem`), Scheduling (`scheduling`), Absence/sick notice (`absence_notice`), Deadline delay negotiation (`deadline_delay`), Internal Slack/Chatwork message (`internal_message`), Business partner email (`business_email`).
- **SERVICES (Dịch vụ & Giao dịch)**: Complaint (`complaint`), Return / refund request (`return_refund`), Reservation (`reservation`), Appointment scheduling (`appointment`), Customer support inquiry (`customer_support`).
- **SOCIAL (Xã hội & Bạn bè)**: Invitation (`invitation`), Thank-you message (`thank_you_message`), Casual update (`casual_update`), Explanation of circumstances (`explanation`).

### 2. Pragmatic Task Structure & Pedagogical Targeting
Every mission defines:
- **Role** (Vai trò của bạn: Kỹ sư BrSE, Nhân viên, Khách hàng, v.v.)
- **Recipient** (Người nhận: Trưởng phòng, Đồng nghiệp, Đối tác, v.v.)
- **Relationship** (Mối quan hệ: Cấp dưới - Cấp trên, Khách hàng - Nhà cung cấp)
- **Objective** (Mục tiêu giao tiếp cụ thể)
- **Context & Situation** (Bối cảnh thực tế song ngữ Việt / Nhật)
- **In-Basket Incoming Message** (Tin nhắn / email thực tế cần phản hồi ở Mode C)
- **Constraints & Rules** (Ràng buộc ngữ cảnh, quy tắc lịch thiệp)
- **Required Information Points** (Checklist các thông tin bắt buộc phải nêu)
- **Target Register** (Casual, Polite, Business Keigo, Formal)
- **Optional Vocabulary Helpers** (Từ vựng gợi ý kèm Furigana, ý nghĩa tiếng Việt và câu ví dụ)
- **Hidden Weakness Targeting**: Organically embeds the learner's active `WritingWeakness` into the task structure without artificial prompts.

### 3. Three Immersion Prompt Modes (Zero Translation Dependency)
- **Mode A (Bilingual Scenario — Song ngữ)**: Read context in Vietnamese, activate vocabulary and concepts in Japanese (designed for N5 / N4 foundations).
- **Mode B (Japanese Scenario — Tiếng Nhật 100%)**: 100% Japanese briefing and constraints for complete intermediate immersion (designed for N3).
- **Mode C (Contextual Simulation / In-Basket)**: Read incoming emails/messages from native speakers and write direct replies without translation (designed for N2 / N1 advanced fluency).

### 4. 10-Dimensional Communicative & Linguistic Evaluation
Evaluates submissions across 10 granular dimensions with score meters and detailed feedback:
1. **Task Completion** (Mục tiêu giao tiếp)
2. **Factual Completeness** (Đầy đủ thông tin bắt buộc)
3. **Naturalness** (Độ thuần Nhật, tính tự nhiên)
4. **Grammar** (Ngữ pháp & Trợ từ)
5. **Vocabulary** (Từ vựng & Thuật ngữ)
6. **Register** (Văn phong phù hợp hoàn cảnh)
7. **Politeness** (Kính ngữ Keigo: Sonkeigo, Kenjougo, Teineigo)
8. **Tone** (Sắc thái cảm xúc & sự tôn trọng đối phương)
9. **Clarity** (Độ sáng sủa, tường minh)
10. **Discourse** (Cấu trúc thư từ & bố cục văn bản)

Includes **Required Information Checklist Verification**, **Native Model Rewrite** with nuance breakdown, and **Japanese Cultural Discourse Tips** (e.g. HOU-REN-SO, Kusshon kotoba, Meiwaku culture).

### 5. Multi-Lifecycle Studio Integration
- **Transition to Simulation (`POST /api/v1/scenarios/{id}/transition-simulation`)**: Instantly creates an interactive multi-turn `SimulationSession` with the scenario persona, seeding Turn 1 (user's submission) and Turn 2 (AI persona reply).
- **Transition to Rewrite Lab**: Seamlessly transfers the submission to Phase 19's self-correction ladder and 6-mode transformation lab.
- **Weakness Mastery Engine Sync**: Automatically updates exposure, correction counts, and `mastery_score` in `WritingWeaknessRepository`.

### Real-World Mission Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/scenarios/mission-taxonomy` | Get all 4 categories, 23 action definitions, 3 prompt modes, and 10 dimensions |
| `POST /api/v1/scenarios/mission/generate` | Dynamically generate an authentic mission with learner profile and weakness targeting |
| `POST /api/v1/scenarios/mission/evaluate` | Evaluate learner Japanese text across 10 communicative dimensions + checklist + rewrite |
| `POST /api/v1/scenarios/{scenario_id}/transition-simulation` | Transition mission into a live multi-turn conversation simulation with AI persona |

## Japanese Expression Intelligence (Phase 21)

Phase 21 delivers **Japanese Expression Intelligence**, designed to improve lexical naturalness, collocation awareness, register precision, and eliminate Vietnamese L1 literalization habits—all strictly through **writing-centered practice** without flashcard mechanisms.

### 1. Collocation Intelligence & Base Word Map
- **Natural Native Combinations**: Detects clumsy or unidiomatic word combinations (verb + noun, adjective + noun, adverb + verb) and provides native-preferred collocations (e.g. `予定を決める` instead of `決定する`).
- **Pedagogical Nuance Explanations**: Explains why certain collocations sound authentic or unnatural in Vietnamese.
- **Base Word Explorer (`GET /api/v1/writing/expressions/collocations/{base_word}`)**: Allows querying authentic native Japanese collocations and example sentences for any verb/noun to elevate writing fluency.

### 2. Personal Expression Bank
- **Persistent Expression Tracking**: Tracks expressions the learner repeatedly uses, naturally uses, misuses, or avoids in `expression_records`.
- **Automatic Aggregation**: Extracted and updated automatically in the background on every writing attempt submission.
- **Analytics & Health Metrics**: Computes average naturalness scores (`naturalness_avg`), register distribution (`registers_used`), and context examples (`example_contexts`).

### 3. Context-Sensitive Overuse & Repetition Radar
- **Repetition Detection**: Identifies overused patterns such as `と思います` (hedging), `ので / から` (subordinate clauses), `すごく / とても` (adverbs), `〜ことです` (nominalization), and monotonously repetitive sentence endings.
- **Context-Sensitive Evaluation**: Distinguishes intentional rhetorical repetition from monotonous habits without false penalties (`is_legitimate: true`).
- **Diverse Alternative Suggestions**: Suggests rich, register-appropriate alternatives to expand vocabulary diversity.

### 4. 3-Tier Vietnamese-to-Japanese Transfer Classification (L1 Interference)
Classifies L1 transfer problems into 3 precise pedagogical tiers rather than simply labeling them "wrong":
1. **Literal Translation (`literal_translation`)**: Word-for-word translation from Vietnamese (translationese).
2. **Grammatically Possible but Unnatural (`grammatically_possible_but_unnatural`)**: Valid grammar, but native speakers rarely phrase thoughts this way.
3. **Native Preferred Alternative (`native_preferred_alternative`)**: Japanese has a dedicated idiomatic pattern or set phrase.

### 5. 5-Tier Register Ladder & 3-Way Expression Variation
- **5-Tier Register Ladder (`POST /api/v1/writing/expressions/register-transform`)**: Transforms sentences across 5 distinct levels:
  1. Casual (ため口 / Plain)
  2. Polite (丁寧語 / です・ます)
  3. Formal (改まった書き言葉 / 論文)
  4. Business (ビジネス敬語 / 社外向け)
  5. Highly Formal (最上級敬語 / 式典・役員向け)
  *Interactive Writing Flow*: Demands the learner actively write their own transformation attempt before revealing the native reference and linguistic breakdown.
- **3 Natural Expression Variations (`POST /api/v1/writing/expressions/variations`)**: Generates 3 distinct authentic Japanese phrasings for the same thought + synthesis challenge prompt for the learner.

### Expression Intelligence Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/writing/expressions/analyze` | Analyze text for collocations, overuse patterns, and Vietnamese transfer issues |
| `GET /api/v1/writing/expressions/bank` | List expressions tracked in the Personal Expression Bank (filterable & paginated) |
| `GET /api/v1/writing/expressions/bank/summary` | Get aggregated expression bank KPIs, top overused items, and transfer hotspots |
| `GET /api/v1/writing/expressions/bank/{id}` | Get detail of a specific tracked expression record |
| `GET /api/v1/writing/expressions/overused` | List expressions identified as overused/repetitive in writing |
| `GET /api/v1/writing/expressions/transfers` | List expressions with Vietnamese L1 transfer issues (filterable by tier) |
| `POST /api/v1/writing/expressions/variations` | Generate 3 natural variations for expressing a thought + synthesis challenge |
| `POST /api/v1/writing/expressions/register-transform` | Transform a sentence across the 5-tier register ladder with honorific rationale |
| `GET /api/v1/writing/expressions/collocations/{base_word}` | Suggest authentic native Japanese collocations for a base word |

## Adaptive Writing Curriculum 2.0 (Phase 22)

Phase 22 delivers **Adaptive Writing Curriculum 2.0 (Lộ trình luyện viết thích ứng 2.0)**, designed to turn diagnostic writing data into an actionable, fatigue-guarded daily writing plan. All scoring, ranking, and task composition is **100% deterministic**, while an optional **safe AI enrichment layer** personalizes prompts and provides session debriefs without mutating deterministic state.

### 1. 8-Signal Deterministic Writing Priority Engine (`WritingPriorityEngine`)
Computes an objective, reproducible composite priority score (0.0–100.0) for each diagnosed writing weakness using 8 weighted pedagogical signals:
1. **Severity ($\times 2.0$)**: Critical communicative breakdown errors receive the highest priority.
2. **Non-Mastery ($\times 2.5$)**: Gaps far from mastery require immediate targeted focus.
3. **Recent Recurrence Frequency ($\times 2.0$)**: Errors repeating over the last 14 days receive escalated priority.
4. **Historical Recurrence ($\times 1.5$)**: Total historical occurrence count.
5. **Practical Communicative Importance ($\times 1.5$)**: Register and grammar impact real-world communication more than isolated vocabulary slips.
6. **Transfer Retest Failure ($\times 1.5$)**: Errors failing generalization across diverse writing contexts.
7. **Goal Alignment ($\times 1.2$)**: Weighted according to learner goals (e.g. Business prioritizes register & discourse; JLPT prioritizes grammar & naturalness).
8. **Register Impact ($\times 1.0$)**: Additional weight for register-specific weaknesses.

### 2. 70 / 20 / 10 Daily Plan Task Allocation (`DailyWritingPlanService`)
Assembles a manageable daily writing plan (default: 4 tasks, bounded 2–8 tasks) based on proven pedagogical memory distribution:
- **70% Persistent Weaknesses**: Targets active weaknesses in `new`, `observed`, `recurring`, `targeted`, or `recurrent` lifecycle states.
- **20% Reinforcement**: Solidifies progressing weaknesses in `improving` and `stable` states to prevent regression.
- **10% Writing Exploration**: Challenges the learner with new writing genres, registers, or free writing prompts to expand comfort zones.

### 3. 8-Context Progression Cycle (`ContextRotationEngine`)
Ensures learners never practice a weakness in isolation or through repetitive drill formats by cycling through 8 distinct real-world contexts:
- `sentence` → `rewrite` → `casual` → `polite` → `business` → `paragraph` → `free_writing` → `real_world_mission` → (repeats)
- Persisted seamlessly inside `WritingWeakness.mastery_evidence["context_rotation"]` JSON without requiring DB schema migrations.

### 4. 4-Dimensional Sliding-Window Fatigue Guard (`FatigueGuard`)
Prevents cognitive overload and monotony within a single practice session by guarding against repetition across 4 orthogonal dimensions:
- Weakness Identity (`weakness_id`)
- Context Type (`context_type`)
- Register (`register`)
- Structural Form (`structure` e.g., sentence vs. paragraph)

### 5. Safe AI Curriculum Enrichment Layer (`CurriculumEnrichmentService`)
- **Non-Mutating Decorator Pattern**: Safely enhances deterministic tasks with contextual Vietnamese task descriptions, personalized priority explanations, and post-session synthesis debriefs.
- **Graceful Fallback**: If AI is offline, rate-limited, or unconfigured, the system seamlessly uses deterministic templates with 0 interruption to the learner.

### 6. Studio Trí Tuệ Viết Integration (`AdaptiveCurriculumPanel`)
- Embedded directly into **Trí Tuệ Viết (`/writing/intelligence`)** under the `📅 Kế hoạch 70/20/10` tab.
- Interactive task completion checklist with direct deep-linking to corresponding studios (**Luyện dịch**, **Viết tự do**, **Rewrite Lab**, **Nhiệm vụ thực tế**).
- One-click **"Hoàn thành buổi học"** triggering context advancement and instant AI session debrief modal.

### Adaptive Curriculum Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/writing/intelligence/curriculum/daily-plan` | Generate today's tailored 70/20/10 daily writing plan (with optional AI enrichment) |
| `GET /api/v1/writing/intelligence/curriculum/priorities` | Get writing weaknesses ranked by the 8-signal WritingPriorityEngine (0–100 score) |
| `POST /api/v1/writing/intelligence/curriculum/session-done` | Mark tasks complete, advance 8-context rotation cycle, and generate AI session debrief |

## Writing Mastery & Boss Assessment (Phase 23)

Phase 23 delivers **Writing Mastery & Boss Assessment (Đánh giá năng lực làm chủ & Đấu trường Boss)**, designed to measure whether the learner can genuinely write better Japanese in unassisted, realistic real-world contexts, rather than merely scoring well in scaffolded practice.

### 1. 8-Dimension Independent Writing Mastery Model (`WritingMasteryService`)
Tracks learner capability across 8 orthogonal linguistic and communicative dimensions without collapsing them into a single misleading score:
1. **Grammar (`grammar`)**: Particles, verb/adjective inflections, clause connectors.
2. **Vocabulary Precision (`vocabulary_precision`)**: Semantic accuracy and contextual fit of chosen words.
3. **Collocation Naturalness (`collocation`)**: Authentic native Japanese word pairings.
4. **Naturalness & L1 Interference (`naturalness`)**: Freedom from Vietnamese literal translation syntax.
5. **Register Appropriateness (`register`)**: Correct tone, politeness, and keigo hierarchy (Sonkeigo, Kenjougo, Teineigo).
6. **Discourse Cohesion (`discourse`)**: Paragraph organization, logical transitions, and information flow.
7. **Task Completion (`task_completion`)**: Full execution of practical communication goals and constraints.
8. **Contextual Adaptability (`contextual_adaptability`)**: Generalization and transfer ability across diverse unseen contexts.

Skills are classified into dynamic status tiers: `mastered` (Làm chủ), `competent` (Thành thục), `developing` (Đang phát triển), `emerging` (Mới xuất hiện), and `regressed` (⚠️ Thoái trào).

### 2. Strict Deterministic 5-Criterion Verification Proof
A skill or dimension is only certified as **Mastered** when it objectively passes all 5 independent pedagogical criteria:
- **Criterion 1 (Repeated Correct Usage)**: $\ge 3$ correct usages across recent practice sessions.
- **Criterion 2 (Delayed Retention)**: $\ge 3-5$ days without error recurrence.
- **Criterion 3 (New-Context Transfer)**: Successful correct application across $\ge 3$ distinct writing contexts.
- **Criterion 4 (Free-Writing Evidence)**: $\ge 50\%$ pass rate in unguided free writing.
- **Criterion 5 (Real-World / Boss Evidence)**: Successful execution in realistic missions or Boss writing assessments.

### 3. Boss Writing Arena (Unassisted Realistic Challenges)
Periodic high-stakes evaluation challenges with strict environmental constraints:
- **Zero Hints & Zero Translation Assistance**: Demands pure generative production from the learner's internal mental model.
- **Unseen Realistic Objective & Genre**: Business email, absence notice, formal complaint, incident explanation, progress report (Hou-Ren-So), or opinion paragraph.
- **Real-Time Countdown Timer & Constraint Checklist**: Strict character count boundaries, audience relationships, and forbidden pattern guards.
- **Adversarial Traps**: AI-crafted scenarios specifically testing learner-prone L1 interference and keigo pitfalls.

### 4. Boss Evaluation & 3-Tier Native Model Rewrite Ladder
Evaluates Boss submissions across all 8 dimensions and provides:
- **Verdict**: `PASS_WITH_DISTINCTION`, `PASS`, `NEEDS_RETRY`, or `FAILED`.
- **Strengths & Critical Gaps**: Concrete feedback on communicative impact.
- **3-Tier Native Model Ladder**:
  1. *Minimal Fix (Sửa Lỗi Tối Thiểu)*: Fixes grammar/particles while preserving the learner's sentence structure.
  2. *Native Polish (Tự Nhiên Chuẩn Nhật)*: Polishes phrasing to sound authentically native.
  3. *Business Keigo (Kính Ngữ Thương Mại Cao Cấp)*: Transforms into formal corporate-grade Japanese with complete honorific etiquette.
- **Historical Delta Tracking**: Compares score deltas and trajectory against previous Boss submissions.

### 5. Regression Detection & Adaptive Reactivation
- When an error recurs on a previously mastered skill, the system automatically detects regression, demotes the weakness lifecycle state to `recurrent`, and flags its status as `regressed`.
- Triggers AI Root-Cause Regression Diagnosis (`AIRegressionDiagnosis`).
- Automatically boosts priority to maximum in `WritingPriorityEngine` so the adaptive curriculum immediately schedules targeted remedial drills.

### 6. Longitudinal Writing Evolution Timeline
Aggregates historical writing progress into 4 longitudinal buckets:
- **Weaknesses Eliminated**: Mastered skills error-free for $\ge 7$ days.
- **Weaknesses Reduced**: Improving skills where correct count exceeds error count.
- **Persistent Weaknesses**: Chronic weaknesses recurring across multiple sessions.
- **Newly Emerging Weaknesses**: Fresh errors identified within the last 7 days.
- Includes AI Longitudinal Evolution Debrief storytelling and longitudinal trajectory charts for Register and Naturalness.

### 7. Studio Trí Tuệ Viết Integration
- **`WritingMasteryPanel`**: Overview KPI cards, 8-dimension mastery matrix, current strengths & urgent priorities, 5-criterion proof modal, and Boss arena trigger.
- **`BossAssessmentModal`**: Unassisted writing workspace, real-time countdown timer, constraint checklist, and post-evaluation dossier with 3-tier rewrite tabs.
- **`WritingEvolutionTimeline`**: Longitudinal timeline, filterable bucket tabs, and progress trajectories.
- Integrated into `WritingIntelligencePage` under the `🏆 Làm Chủ & Boss Assessment` tab.

### Writing Mastery Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/writing/mastery/profile` | Get 8-dimension mastery profile, 5-criterion proof, strengths, priorities, and next Boss recommendation |
| `GET /api/v1/writing/mastery/evolution` | Get longitudinal writing evolution timeline (eliminated, reduced, persistent, emerging, AI debrief) |
| `POST /api/v1/writing/mastery/boss/generate` | Generate an unassisted Boss Writing Task with adversarial traps and constraints |
| `GET /api/v1/writing/mastery/boss/pending` | Get the current pending Boss Task for the learner |
| `POST /api/v1/writing/mastery/boss/{task_id}/submit` | Submit Boss writing for 8-dimension evaluation, 3-tier rewrites, and regression detection |
| `GET /api/v1/writing/mastery/boss/history` | Get past Boss assessment submissions and score trajectory |

## Migrations

```powershell
python -m alembic revision --autogenerate -m "description"   # create a migration
python -m alembic upgrade head                               # apply migrations
python -m alembic downgrade -1                               # roll back one step
```

## Testing foundation

Backend tests cover: health endpoint, configuration loading, database initialization, repository behavior, AI provider contracts and error hierarchy, structured-output parsing, Gemini/Groq/Ollama SDK normalization (mocked), router selection/retry/fallback, fake failure modes, the AI diagnostics/config endpoints, prompt rendering (planner/generator/validator + all six evaluation prompts + the four learning prompts), exercise schemas, deduplication (exact + near), exercise repository, the three-stage generation service (incl. regeneration and cross-stage consistency), the exercises API (generate / list / filters / duplicate `409` / error mapping), evaluation schemas, consistency validation, score synthesis, the five-stage evaluation service (incl. cycle regeneration, verifier rejection, hint progression, idempotent reveal) and the attempts API (submit / history / hint / reveal / leak prevention), vocabulary schemas, extraction pipeline and vocabulary API, learner evidence, profile synthesis, mistake clustering, learning planner, adaptive-learning service (sessions, recommendations, submission hook) and the learning API (profile CRUD incl. the streak toggle, today, next, recommendation, history) including an end-to-end submit → session/profile/recommendation flow, plus the Phase 7 gamification suite, Phase 8 long-form writing suite, Phase 10 simulation suite, Phase 11 quality suite, Phase 16 writing intelligence suite, Phase 17 persistent error & mastery engine suite, Phase 18 targeted writing drill suite, Phase 19 self-correction & rewrite lab suite, Phase 20 real-world writing mission system suite, Phase 21 Japanese expression intelligence suite, Phase 22 adaptive writing curriculum 2.0 suite, and Phase 23 writing mastery & boss assessment suite (`test_writing_mastery.py` covering 8-dimension profile, deterministic 5-criterion proof, regression detection/demotion, boss task generation with fallback, 8-dimension boss evaluation with 3-tier rewrites, evolution timeline aggregation, and all REST endpoints).

Frontend tests cover: application rendering, routing, API client configuration, the Settings page (AI provider section + learner profile form + streak toggle), the Practice / Free Writing pages, Dashboard, Challenge page, ExerciseView learning flow, Phase 8 writing workspace, Phase 9 scenarios, Phase 10 simulation page, Phase 11 AI quality diagnostics page, Phase 16-17 Studio Trí Tuệ Viết page, Phase 18 interactive targeted drill workspace modal (`WritingDrillModal` + `WritingDrillWorkspace`), Phase 19 Rewrite Lab page (`RewriteLabPage` + `SelfCorrectionLadder` + `RewriteComparisonCard` + `RewriteModesWorkspace` + `TransferCheckWorkspace` + `LinguisticDiffViewer` + `SocraticCoachPane`), Phase 20 Real-World Mission Studio (`ScenarioPage` + `MissionCategoryPicker` + `MissionPromptModeSelector` + `MissionBriefingCard` + `MissionWritingDesk` + `MissionEvaluationDashboard`), Phase 21 Expression Intelligence Studio (`ExpressionBankPanel` + `CollocationMap` + `OveruseRadar` + `TransferDetectionPanel` + `RegisterLadderModal` + `ExpressionVariationModal`), Phase 22 Adaptive Curriculum Panel (`AdaptiveCurriculumPanel` with 70/20/10 task board, priority leaderboard, direct studio launch, and session completion debrief workflow), and Phase 23 Writing Mastery & Boss Assessment (`WritingMasteryPanel.test.tsx` + `WritingMasteryPanel` + `BossAssessmentModal` + `WritingEvolutionTimeline` covering 8-dimension mastery overview, 5-criterion verification modal, unassisted Boss writing arena with 3-tier rewrite dossier, longitudinal evolution buckets, and tab switching).

## Roadmap

- **ROADMAP EXPANDED — PHASES 1–23 COMPLETE.** All 23 planned phases are delivered, integrated, and verified: 845 backend tests (100% passing) + 308 frontend tests across 50 test files (100% passing) + full frontend Vite production build (0 TypeScript errors), ruff clean, and production DB schema integrated.

Post-v1 ideas (not planned, no commitment): real authentication with per-user data isolation (the app still uses the anonymous-learner model by design), streaming AI responses, a distributed rate limiter (Redis) for multi-process deployments, and multi-user roleplay simulation sessions.