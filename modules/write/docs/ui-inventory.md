# Current UI / UX Inventory

**Application:** AI Japanese Writing Tutor — Vietnamese-language AI Japanese-writing tutor.
**Frontend:** React 19 + TypeScript + Vite, `react-router-dom` v7, plain CSS (single `index.css`, no UI framework, no Tailwind).
**Scope of this document:** everything implemented in `apps/web/src` as of the Phase 15 codebase. Read-only inventory — no components, pages, or states are invented here. Every element listed below exists in source code.
**Source of truth:** `apps/web/src` (App.tsx, layouts/, pages/, components/, hooks/, services/, lib/, types/, index.css).

---

## 1. Product structure

```
apps/web/src/
├── main.tsx                 # StrictMode + ErrorBoundary + BrowserRouter
├── App.tsx                  # Route table (12 routes + wildcard), lazy pages, per-route ErrorBoundary
├── index.css                # Entire design system (single file, 1901 lines, plain CSS)
├── layouts/
│   └── AppLayout.tsx        # Sidebar navigation shell; probes backend for 2 conditional nav items
├── pages/                   # 14 route shells (DashboardPage is eager; 12 lazy; History is a placeholder)
├── components/              # 14 shared components
├── hooks/                   # useAsync (fetch wrapper), useApi (client memo)
├── services/api.ts          # Typed API client (90+ methods)
├── lib/api.ts               # ApiClient + ApiError envelope parsing, 10s default timeout
├── lib/config.ts            # base URL: VITE_API_BASE_URL | origin (prod) | localhost:8000 (dev)
└── types/api.ts             # All API/domain types + Vietnamese label maps (1,491 lines)
```

- **Language:** 100 % of user-facing copy is Vietnamese (labels, descriptions, errors, empty states). Japanese appears only in learner-written content and vocabulary expressions. `<html lang="vi">`.
- **Single-page app, single shell:** every route renders inside `AppLayout` (sidebar + content column). No top bar, no breadcrumbs, no footer.
- **No auth:** `user_id` is nullable; there is one implicit user. No login screens.
- **No modals/dialogs/drawers/tabs/toasts exist anywhere.** All state changes are inline on the page. Confirmations are not used anywhere (see §13).
- **Route-level error handling:** each lazy page is wrapped in `ErrorBoundary` (resetKey = route name) inside `App.tsx`; the whole app is additionally wrapped by a root `ErrorBoundary` in `main.tsx`. Lazy-loading fallback is the shared `LoadingSpinner`.
- **Gated features:** `/ai-quality` and `/analytics` are hidden from navigation until a backend probe succeeds at app boot (`GET /api/v1/ai/quality/status`, `GET /api/v1/analytics/summary?window=30d`). Their pages also self-gate (render a "not available in this environment" card on 404/error).
- **Cross-page state:** the only persistent client state is a per-exercise draft autosave in `localStorage` (`draft:free-writing:{exerciseId}`, 400 ms debounce). Everything else is server-persisted (exercises, attempts, submissions, simulations, memories, journey).

### Key implementation facts that shape the UI

| Fact | Evidence |
|---|---|
| Every page fetches on mount via the `useAsync` hook; refetch is manual (`run()`) | `hooks/useAsync.ts` |
| Errors surface as plain `<p class="error-text">` paragraphs near the failing control | throughout pages |
| No toast/notification system, no inline form validation library | — |
| Success states are inline text paragraphs (`ok-text`) or button label swaps | e.g. `Đã lưu ghi nhớ.` |
| Buttons are styled by CSS classes only (`primary-button`, `secondary-button`, …) — there is no `<Button>` component | `index.css`, pages |
| Icons are emoji characters hard-coded in JSX | `🏅 ✅ ⚠️ 💼 ❌ 💡 🚫 ✨ ◐ ▲ ▼ ▬ → ←` |

---

## 2. Route map

| Route | Page/Component | Purpose | Primary CTA | Key actions / APIs |
|---|---|---|---|---|
| `/` | DashboardPage | Daily overview: system health, gamification, journey, progress, mission, profile, recommendation | "Nhận gợi ý bài tập" / "Làm mới gợi ý" | 6 parallel loads: health, learning/today, gamification/today, milestones, journey, analytics/learner-summary |
| `/practice` | PracticePage | Exercise hub: 5 generation modes (AI gợi ý / Tùy chỉnh / Ngẫu nhiên / Thử thách / Tình huống), exercise editor, saved exercises | Mode-dependent: "Luyện tập ngay" / "Tạo bài tập" / "Tạo bài tập ngẫu nhiên" / "Nhận thử thách" / "Tạo tình huống mới" | exercises list, learning/recommendation, journey objective context, generate/next/challenge/scenario APIs, `ExerciseView` |
| `/journey` | JourneyPage | Long-term learning journey: create, view milestones → objectives, mastery, explanations, replan | "Tạo lộ trình" / "Đi luyện tập ngay" | journey status, create (force regenerate), per-objective explanation |
| `/free-writing` | FreeWritingPage | Long-form writing workspace with revisions, compare, coach; supports `?exercise=&scenario=` deep links | "Gửi bài" / "Gửi bản sửa" | generate free-writing exercise, writing submissions/revisions/evaluation/compare/hint/reveal/coach |
| `/challenge` | ChallengePage | Standalone challenge (same panel as Practice mode) | "Nhận thử thách" | challenges/generate, challenge attempts |
| `/simulation` | SimulationPage | AI conversation simulation around a scenario; `?scenario=` preselect | "Bắt đầu hội thoại…" / "Tạo tình huống mới" | simulations CRUD, turns, explain, coach, summary; recent scenarios |
| `/vocabulary` | VocabularyPage | Personal vocabulary bank: search + filters + list | "Xem" (per item) | vocabulary list |
| `/vocabulary/:id` | VocabularyDetailPage | Vocabulary entry detail: reason, example, alternatives, usage stats, discovery history, technical provenance | "← Quay lại ngân hàng từ vựng" | vocabulary detail |
| `/history` | HistoryPage | **Placeholder only** — empty state with text "sẽ được hiển thị tại đây trong Phase 2" | none | none |
| `/memory` | MemoryPage | AI memory store: manual create, list, refresh, archive, forget | "Lưu ghi nhớ" | memory CRUD + refresh |
| `/ai-quality` | AiQualityPage | Developer diagnostics: quality registry, telemetry, golden benchmark runner, prompt registry (gated) | "Chạy điểm chuẩn" | quality status/telemetry/prompts, benchmark run + results |
| `/analytics` | AnalyticsPage | Product intelligence: windows, skill grids, calibration, funnel, AI telemetry/cost, recommendations, A/B experiments (gated) | "Chạy phân tích mới" | 9 analytics endpoints |
| `/settings` | SettingsPage | AI providers, API keys, model list, learner profile (goal/JLPT/daily/registers/topics/streak/memory toggles) | "Lưu cấu hình" / "Lưu hồ sơ" | providers, config get/put, models, profile get/put |
| `*` | — | Catch-all → `<Navigate to="/" replace />` | — | — |

Notes:
- Dashboard is the only eagerly-imported page; all others lazy-load with the shared spinner as Suspense fallback.
- `/free-writing?exercise={id}&scenario={id}` is a real deep-link contract (created by PracticePage and used to boot the workspace). `/simulation?scenario={id}` likewise.
- `/history` is reachable from the sidebar but is a dead-end placeholder.

---

## 3. Navigation map

### Sidebar (only navigation surface; `AppLayout.tsx`)

Fixed 260 px dark sidebar (`#141b2e`), brand block ("AI Japanese Writing Tutor" / tagline "Luyện viết tiếng Nhật cùng AI"), then a vertical `NavLink` list. Active state = indigo fill (`--primary`), hover = translucent white. No icons. No grouping/headers. No user menu.

Order (10 static + 2 conditional):

| # | Label | Route | Notes |
|---|---|---|---|
| 1 | Bảng điều khiển | `/` | `end` match |
| 2 | Luyện tập | `/practice` | |
| 3 | Lộ trình | `/journey` | |
| 4 | Viết tự do | `/free-writing` | |
| 5 | Thử thách | `/challenge` | |
| 6 | Mô phỏng | `/simulation` | |
| 7 | Từ vựng | `/vocabulary` | |
| 8 | Lịch sử | `/history` | dead-end placeholder |
| 9 | Trí nhớ | `/memory` | |
| 10 | Cài đặt | `/settings` | |
| 11 | Ch���t l�����ng AI | `/ai-quality` | **Label is mojibake in source** (`AppLayout.tsx:59`) — rendered text is corrupted Vietnamese; shown only when `qualityStatus().enabled` |
| 12 | Phǽn t��ch | `/analytics` | **Label is mojibake in source** (`AppLayout.tsx:60`); shown only when `analyticsSummary('30d')` succeeds |

### Other navigation

- **In-content links styled as buttons** (anchors, not NavLinks): "Xem lộ trình" → `/journey`, "Xem phân tích chi tiết" → `/analytics`, "Đi luyện tập ngay" → `/practice`, "Xem toàn bộ từ vựng →" → `/vocabulary`, "← Quay lại ngân hàng từ vựng" → `/vocabulary`, "Xem" per vocabulary row → `/vocabulary/:id`.
- **In-text anchors:** "Tạo lộ trình" inside the dashboard journey-empty copy → `/journey`.
- **Programmatic navigation:** Practice → `/free-writing?exercise=…&scenario=…` (scenario start); Practice/Simulation → `/simulation?scenario=…`; SimulationSummaryPanel → `/challenge`; SimulationPage "Tới trang luyện tập" → `/practice`.
- **Contextual "back" affordances:** RevisionCompare "Về bản mới nhất" (returns to latest revision evaluation); simulation summary "Xem lại hội thoại"; vocabulary detail back-links.
- **No breadcrumbs, no tabs, no drawer, no top bar, no footer.**

---

## 4. Page inventory

Every page opens with `<PageHeader>` (h1 + description paragraph) rendered into `.content` (max-width 960 px). Sections are stacked `.card` elements (`border 1px, radius 12px, padding 20/24px`).

### 4.1 Dashboard (`/`)

```text
DASHBOARD
├── PageHeader "Bảng điều khiển" + "Tổng quan về quá trình luyện tập của bạn."
├── Card 1 "Trạng thái hệ thống"
│   ├── Loading: spinner "Đang kiểm tra kết nối API..."
│   ├── Error: error-text "Không thể kết nối đến máy chủ: …"
│   └── OK: "API hoạt động bình thường (v{version} · Cơ sở dữ liệu: kết nối OK/chưa kiểm tra)"
├── Card 2 "Hành trình của bạn"            (GET /gamification/today)
│   ├── trend-card: Cấp N · XP · "còn X XP nữa lên cấp N+1" + XP progress bar
│   ├── trend-card: "N ngày" chuỗi hiện tại (kỷ lục: N)
│   ├── trend-card: "N XP" hôm nay
│   ├── trend-card: "x/y" mục tiêu hôm nay + progress bar
│   ├── ✅ "Đã hoàn thành mục tiêu hôm nay (+25 XP)!"  (when completed)
│   ├── 💬 encouragement text               (when present)
│   └── ul.reminder-list                    (when present)
├── Card 3 "Lộ trình dài hạn"               (GET /learning/journey)
│   ├── Loading / error / JourneyCard
│   └── JourneyCard: goal-type chip, title, "N% tổng thể" + progress bar,
│       "Mục tiêu hiện tại: …" or "Tất cả mục tiêu đã hoàn thành!",
│       link-button "Xem lộ trình"
│       or empty: "Chưa có lộ trình dài hạn. Tạo lộ trình …" (in-text anchor)
├── Card 4 "Tiến bộ tháng này"              (GET /analytics/learner-summary?window=30d)
│   ├── Loading / error
│   ├── trend-card: avg skill score/100 + bar; trend-card: "N kỹ năng có dữ liệu"
│   ├── "Điểm mạnh: …" / "Cần cải thiện: …" (top/bottom 3)
│   └── link-button "Xem phân tích chi tiết"
│   or empty: "Chưa có đủ dữ liệu trong 30 ngày qua…"
├── Card 5 "Nhiệm vụ hôm nay"               (from /gamification/today)
│   ├── mission title + chip "x/y" + description
│   ├── ✅ "Hoàn thành nhiệm vụ!…" (when completed)
│   └── button "Đổi nhiệm vụ khác"
│   or empty: "Chưa có nhiệm vụ hôm nay…"
├── Card 6 "Mốc thành tích"                 (GET /gamification/milestones)
│   └── milestone list: 🏅 title, description, italic celebration (AI)
│       or empty: "Chưa có mốc nào…"
├── Card 7 "Hồ sơ học tập"                  (from /learning/today)
│   ├── "Đã phân tích N bài viết · Mục tiêu: '…' · Mục tiêu JLPT: … · Mục tiêu N bài/ngày · Ước tính JLPT: N5–N3"
│   ├── trend-grid: Điểm trung bình /100 · Cải thiện 7 ngày (+N) · Bài viết 7 ngày
│   ├── Điểm mạnh / Cần cải thiện lists
│   └── or empty: "Bạn chưa có bài chấm điểm nào…"
├── Card 8 "Gợi ý hôm nay" (RecommendationCard)
│   ├── reason text, meta list (topic, JLPT·difficulty, focus skills), prompt preview
│   ├── button "Làm mới gợi ý" (or "Nhận gợi ý bài tập" when none)
│   └── or empty: "Chưa có gợi ý nào…"
└── EmptyState (only when focus.evidence_count === 0)
    "Bắt đầu hành trình tiếng Nhật của bạn" + description (dashed-border box)
```

Loading granularity: each card loads independently (spinner inside the card); the RecommendationCard is hidden until profile load resolves. Dashboard fires 6 API calls on mount.

### 4.2 Practice (`/practice`)

```text
PRACTICE
├── PageHeader "Luyện tập" + "Thực hành dịch Việt – Nhật…"
├── Card "Tạo bài tập mới"
│   ├── mode-selector: 5 toggle buttons (AI gợi ý / Tùy chỉnh / Ngẫu nhiên / Thử thách / Tình huống)
│   │   each: strong label + small description; active = indigo border + tint
│   ├── [mode AI gợi ý]
│   │   ├── JourneyBanner (current objective chip + title + competency chips
│   │   │   + mastery progress bar + "Xem toàn bộ lộ trình →" link)  [hidden on error]
│   │   ├── recommendation.reason, meta (topic · JLPT·difficulty·register · focus)
│   │   ├── prompt preview
│   │   ├── primary "Luyện tập ngay" + secondary "Gợi ý khác"
│   │   └── or empty: "Chưa có gợi ý nào…" + primary "Nhận gợi ý bài tập"
│   ├── [mode Tùy chỉnh]
│   │   └── 5 inline selects (Loại bài tập / Ngữ điệu / JLPT / Độ khó 1–10 / Độ dài)
│   │       + primary "Tạo bài tập"
│   ├── [mode Ngẫu nhiên]
│   │   └── primary "Tạo bài tập ngẫu nhiên"
│   ├── [mode Thử thách]
│   │   ├── ChallengePanel (when challenge exists) — see §4.7
│   │   └── or explainer text + primary "Nhận thử thách"
│   ├── [mode Tình huống]
│   │   ├── explainer text
│   │   ├── ScenarioPanel (when scenario exists) — see §4.6
│   │   ├── primary "Bắt đầu hội thoại mô phỏng" (→ /simulation?scenario=)
│   │   ├── or primary "Tạo tình huống mới"
│   │   └── "Tình huống đã viết": list rows (genre·medium·purpose + "Đã viết N lần · date")
│   │       row = "write again" button + secondary "Hội thoại" button
│   └── shared error line "Không thể tạo bài tập: …" (any mode)
├── [while generating] LoadingSpinner "AI đang tạo bài tập..."
├── [when current exercise] Card "Bài tập của bạn" → ExerciseView (see §4.3)
└── Card "Bài tập đã lưu"                     (GET /exercises?limit=50)
    ├── list: topic › subtopic + prompt truncated at 80 chars (click → open in ExerciseView)
    └── or EmptyState "Chưa có bài tập nào" ("Nhấn 'Tạo bài tập' để AI sinh bài tập đầu tiên của bạn.")
```

Mode switching is purely client-side (5 local-state panels in one card). `generating` is one shared flag for all generation paths; every generator sets `current`/`challenge`/`scenario` accordingly.

### 4.3 ExerciseView (shared component; embedded in Practice)

```text
EXERCISE VIEW
├── exercise-meta chips: type · topic › subtopic · register · JLPT · difficulty/10 · target length
├── context paragraph (if any)
├── prompt_vi (large text)
├── label "Câu trả lời tiếng Nhật của bạn" + textarea (rows=5, min-height 120px)
├── primary "Gửi bài" + error line
├── [when attempts exist] "Lịch sử lần thử"
│   ├── attempt chips "Lần N: score" (click → load evaluation)
│   └── progress hint "↑ Có tiến bộ so với lần trước." / "↓ Điểm thấp hơn lần trước…"
├── [after evaluation]
│   ├── header: big score (score-overall, e.g. "78 / 100") + summary + semantic/naturalness chips
│   ├── 6 score bars: Ý nghĩa · Ngữ pháp · Từ vựng · Tự nhiên · Phù hợp ngữ cảnh · Phù hợp ngữ điệu
│   ├── "Nhận xét chi tiết": issue cards (icon bucket ❌/⚠️/💼 + severity chip
│   │   + 「original」+ explanation + → suggested_fix)  or ✅ "Tốt — không có lỗi cần sửa."
│   ├── "Gợi ý": progressive hint list; secondary "Gợi ý tiếp theo" (while hints remain)
│   ├── [when revealAvailable] primary "Xem đáp án" + "Bạn đã sẵn sàng…? Hãy thử sửa lại trước nhé."
│   ├── [when revealed] "Đáp án": correction blocks (Bản sửa đúng / Bản tự nhiên / Bản như người bản xứ
│   │   + register variants Thân mật / Lịch sự / Kinh doanh, only non-null)
│   └── "✨ Từ vựng đáng học": up to 5 expressions (expression, reading, meaning, example, reason)
│       + link-button "Xem toàn bộ từ vựng →"
```

Attempt vocabulary loads lazily per attempt (`GET /exercises/{id}/attempts/{id}/vocabulary`).

### 4.4 Free Writing / Writing Workspace (`/free-writing`)

```text
FREE WRITING
├── PageHeader "Viết tự do"
├── [when no scenario loaded] Card "Tạo đề tài viết"
│   ├── explainer text
│   ├── select Ngữ điệu (AI tự chọn / Thân mật / Lịch sự / Kinh doanh)
│   ├── select Độ dài (AI tự chọn / Đoạn văn 80–150 chữ / Bài viết dài 150–300+ chữ)
│   ├── primary "Tạo đề tài" + error line
├── [bootLoading] spinner "Đang tải đề tài viết..."   (deep link ?exercise=)
├── [generating] spinner "AI đang tạo đề tài..."
├── [when current exercise] Card "Đề tài của bạn"
│   ├── chips: Tình huống/Viết tự do · topic › subtopic · register · JLPT · difficulty · target length
│   ├── context paragraph
│   ├── [scenario deep link] scenario-reminder panel:
│   │   "Tình huống" situation text + context + numbered "Yêu cầu bắt buộc"
│   │   + "Lưu ý tránh" (🚫 patterns)
│   ├── prompt_vi
│   ├── label "Bài viết tiếng Nhật của bạn" + textarea (rows=8, autosaves to localStorage)
│   ├── primary "Gửi bài" / "Gửi bản sửa" + "N chữ" counter + error
│   ├── [after first submission] "Lịch sử bản viết": revision chips "Bản N: score"
│   ├── [compare mode] RevisionCompare (delta bars, added/removed/changed sentences,
│   │   AI guidance, "Về bản mới nhất")
│   └── [evaluation mode] WritingResults (see below)
│       + "Trợ lý viết AI" section:
│         explainer, 4 preset chips, coach textarea (rows=3), primary "Hỏi trợ lý",
│         answer box (coach-answer) + suggestions list
└── (no footer)
```

WritingResults (post-submission only) renders:
- header: overall_writing score + summary + chips (sentence count, sentence quality, discourse quality, "Chỉ chấm từng câu", "Phân tích mạch văn tạm thời không khả dụng")
- 6 discourse score bars (Mạch lạc, Liên kết câu, Bố cục, Trôi chảy, Nhất quán phong cách, Không lặp thừa)
- [scenario exercise only] "Đánh giá theo tình huống": scenario_fit chip + 5 bars (Phù hợp tình huống, Phù hợp người nhận, Đạt mục đích, Phù hợp giọng điệu, Tuân thủ yêu cầu) + required-point checklist (✅/◐/❌ + explanation) + genre-format checklist (✅ Có / ◐ Một phần / ❌ Thiếu)
- "Điểm mạnh" (✅ list)
- "Gợi ý cấu trúc" block (reorder advice + template + reason) and/or "Cấu trúc cải thiện gợi ý"
- "Bài viết theo từng câu": clickable sentence buttons (number, text, score) — selectable; issue links scroll to sentence
- "Nhận xét chi tiết": issues grouped by category (severity chip, "Câu N" chip, explanation, → fix, "Xem câu liên quan" button)
- "Gợi ý cải thiện": progressive hints + "Gợi ý tiếp theo"
- Rewrites: gated by learning mode — either reveal button ("Xem bản viết lại" + nudge text) or 3 rewrite blocks (Sửa tối thiểu / Viết lại tự nhiên / Viết lại như người bản xứ) + optional professional rewrite ("Viết lại trang trọng (chuyên nghiệp)")

### 4.5 Simulation (`/simulation`)

Two-column grid (`simulation-layout`: main 1fr + 300 px history aside).

```text
SIMULATION
├── PageHeader "Mô phỏng hội thoại"
├── [main column]
│   ├── [no session] Card "Bắt đầu hội thoại mới"
│   │   ├── explainer
│   │   ├── radio group: "Có hướng dẫn — phản hồi chi tiết sau mỗi lượt trả lời"
│   │   │                / "Đắm chìm — không phản hồi, trải nghiệm như hội thoại thật"
│   │   ├── [when ?scenario=] primary "Bắt đầu hội thoại với tình huống này"
│   │   ├── [else] primary "Tạo tình huống mới"
│   │   │   + "Tình huống đã viết" list (genre·medium·purpose, register, attempt count, date)
│   │   └── error line
│   ├── [session active] toolbar "Hội thoại mới" (secondary) + type·mode label
│   │   └── SimulationConversation:
│   │       ├── banner: objective_vi, meta (register · JLPT · difficulty · pressure_condition)
│   │       │   chips: "Lượt x/y", "Giai đoạn: …", "Mục tiêu chưa hoàn thành: N"
│   │       │   immersive note (italic)
│   │       ├── thread (role=log): bubbles — AI left (white), user right (indigo);
│   │       │   meta "AI (turn_type) / Bạn · lượt N"
│   │       │   [guided + user turn] eval box: score chips (Tổng / Tự nhiên / Hợp tình huống),
│   │       │     feedback, issues (category: explanation + "Gợi ý: fix"),
│   │       │     corrections (Sửa tối thiểu / Viết lại tự nhiên),
│   │       │     "Giải thích chi tiết" button → explanation box
│   │       ├── [active] composer: textarea (min-height 90px, Ctrl+Enter hint),
│   │       │   primary "Gửi trả lời", secondary "Kết thúc hội thoại"
│   │       ├── [active] coach panel "Hỏi trợ lý": 3 presets, input + "Hỏi", answer box
│   │       └── [ended] "Hội thoại đã kết thúc." + primary "Xem tổng kết"
│   └── [ended session] SimulationSummaryPanel:
│       "Tổng kết hội thoại" + summary text + meta (resolution · turns · AI/system generated)
│       + dimension score bars (Tổng thể / Chất lượng câu / Phù hợp tình huống /
│         Tiến độ mục tiêu / Hiệu quả giao tiếp / Độ tự nhiên)
│       + "So sánh với hội thoại trước" (deltas +/colored)
│       + "Điểm mạnh" + "Cần cải thiện"
│       + "Thử thách gợi ý" dashed-indigo box (when suggested_challenge)
│       + actions: "Xem lại hội thoại" (secondary), "Hội thoại mới" (primary),
│         "Nhận thử thách gợi ý" (primary → /challenge)
└── [aside] Card "Hội thoại gần đây"      (GET /simulations?limit=10)
    ├── list: type, mode · N lượt · avg/100, status ("Đang diễn ra" / resolution) · date
    ├── or EmptyState "Chưa có hội thoại nào"
    └── secondary "Tới trang luyện tập" (→ /practice)
```

### 4.6 ScenarioPanel (embedded in Practice "Tình huống" mode)

Chips (genre · medium · register · tone · JLPT · difficulty) → "Tình huống" text → "Bối cảnh" → numbered "Yêu cầu bắt buộc" → "Gợi ý thêm (không bắt buộc)" (💡) → "Lưu ý tránh" (🚫) → primary "Bắt đầu viết".

### 4.7 ChallengePanel (embedded in Practice "Thử thách" mode and Challenge page)

Chips (type · objective · difficulty · +XP · ✅ Đã hoàn thành) → "Bắt buộc sử dụng: {expression}" → instruction_vi → "Văn bản nguồn" block → textarea (rows=5) → primary "Gửi bài" (disabled when completed) → result: score + "✅ Thành công! Bạn nhận được N XP." / "Chưa đạt yêu cầu — đọc kỹ hướng dẫn và thử lại nhé." + summary + issues list.

### 4.8 Challenge page (`/challenge`)

Toolbar card (primary "Nhận thử thách" / "Tạo thử thách mới" + error) → spinner → ChallengePanel card → or EmptyState "Chưa có thử thách nào".

### 4.9 Vocabulary (`/vocabulary`)

```text
VOCABULARY
├── PageHeader "Từ vựng"
├── Card filter toolbar:
│   ├── search input ("Tìm theo từ, âm đọc hoặc nghĩa...", Enter submits) + secondary "Tìm"
│   │   (disabled while search == applied search; 3 filters re-query instantly, no debounce)
│   ├── select Loại từ vựng (Tất cả loại / Từ / Cụm từ / Kết hợp từ)
│   ├── select Trình độ JLPT (Mọi trình độ / N5–N1)
│   └── select Ngữ điệu (Mọi ngữ điệu / Thân mật / Lịch sự / Kinh doanh / Hỗn hợp)
├── [loading] spinner  |  [error] error-text
├── [results] Card "Ngân hàng từ vựng (N)": list rows:
│   expression (bold) + reading + type chip + JLPT chip + "Độ khó x/10" + "Quan trọng x/10"
│   + meaning + example + familiarity chip (Mới/Đang học/Quen thuộc/Đã nắm chắc)
│   + "Gặp N lần · dùng N lần · sai N lần" + Link-button "Xem"
└── [empty] EmptyState "Chưa có từ vựng"
```

No pagination control — fixed `limit: 50`.

### 4.10 Vocabulary detail (`/vocabulary/:id`)

Header = expression + meaning. Card 1: chips (reading, type, part of speech, JLPT, difficulty, importance, register, usage context, familiarity) → "Vì sao nên học từ này?" (learning_reason + 「bạn đã viết」) → "Ví dụ" → "Những cách nói tương đương" → "Ghi chú" (pre-wrap) → "Thói quen sử dụng" stats list. Card 2 "Xuất xứ (N)": discovery list (「context」, source label + 「bạn viết」, learning reason, exercise/attempt context). Card 3 "Thông tin kỹ thuật": provider · model · prompt version · vocabulary version. Bottom back-link. Error state: header + error + back-link.

### 4.11 Journey (`/journey`)

```text
JOURNEY
├── PageHeader "Lộ trình học tập"
├── [no journey] Card "Bắt đầu một lộ trình học":
│   ├── explainer, label "Mục tiêu", select (8 goal types: Tiếng Nhật tổng hợp /
│   │   Hội thoại hằng ngày / Tiếng Nhật công việc / Tiếng Nhật IT / Tiếng Nhật BRSE /
│   │   Luyện thi JLPT / Tiếng Nhật tự nhiên / Lưu loát viết), error line,
│   └── primary "Tạo lộ trình"
├── [journey exists]
│   ├── Card summary: goal-type label + goal text + "N% tổng thể" + progress bar
│   │   + AI explanation + "Đổi mục tiêu" select + secondary "Tạo lại lộ trình" (force regenerate)
│   │   + error line
│   ├── Per milestone Card "journey-milestone" (unstyled wrapper class — see §13):
│   │   chip "Giai đoạn N" + status span (status-ok class, unstyled)
│   │   + title + description
│   │   + objective rows: position number, title + "đang luyện" chip (current),
│   │     competencies · status meta, right side "score/100" + mastery label
│   │     + progress bar + AI explanation box (MasteryBadge, only for active objective)
│   │     locked objectives get opacity 0.55
│   └── Card CTA: "Luyện tập mục tiêu hiện tại" + primary link "Đi luyện tập ngay"
```

### 4.12 Memory (`/memory`)

```text
MEMORY
├── PageHeader "Trí nhớ học tập"
├── Card "Thêm ghi nhớ thủ công"
│   ├── explainer ("ghi nhớ bạn tự tạo luôn có quyền ưu tiên cao nhất")
│   ├── label + select "Loại ghi nhớ" (11 categories: Sở thích / Cách học / Lỗi sai / Điểm mạnh /
│   │   Từ vựng / Cách diễn đạt / Tình huống / Mô phỏng / Mục tiêu / Phong cách / Cột mốc)
│   ├── label + text input "Nội dung" (maxLength 500, placeholder example)
│   ├── label + number input "Mức quan trọng (1–10)" (default 7, clamped 1–10 client-side)
│   ├── ✅ "Đã lưu ghi nhớ." / error line
│   └── primary "Lưu ghi nhớ" (disabled when empty)
├── Card "Ghi nhớ của tôi (N)" (toolbar header class undefined — see §13)
│   └── secondary "Rà soát lại" + result line ("Đã xử lý N sự kiện · tạo N · cập nhật N · loại N · hết hạn N")
├── [list] Card: memory rows (classes undefined — unstyled):
│   category span, type chip, confidence chip, "Quan trọng x/10", source chip
│   ("Bạn tạo / Từ đánh giá / Từ từ vựng / Từ tình huống / Từ mô phỏng"),
│   "Đã lưu trữ"/"Đã hết hạn" chip (non-active), content text,
│   "Gặp N lần · bắt đầu {date}", actions: secondary "Lưu trữ" + (unstyled) "Quên"
└── [empty] EmptyState "Chưa có ghi nhớ nào"
```

### 4.13 Settings (`/settings`)

```text
SETTINGS
├── PageHeader "Cài đặt"
├── Card "Nhà cung cấp AI"
│   ├── default provider + fallback providers line
│   └── provider-table: Nhà cung cấp · Cấu hình (Đã/Chưa cấu hình) · Khả dụng (ok/error text) · Mô hình mặc định
├── Card "Khóa API"
│   ├── explainer (server-side storage, masked only, blank = keep)
│   ├── 3 credential rows: Gemini API key (password, placeholder "AIza...",
│   │   label shows masked status), Groq API key (password, "gsk_..."), Ollama URL (text,
│   │   "http://127.0.0.1:11434")
│   ├── ✅ "Đã lưu cấu hình." / error
│   └── primary "Lưu cấu hình"
├── Card "Danh sách mô hình"
│   ├── per provider: h3 + model list, or localized error (Chưa cấu hình khóa / Khóa API không hợp lệ / …)
│   ├── primary "Tải danh sách mô hình" → list; secondary "Làm mới"
└── Card "Hồ sơ học tập"
    ├── text "Mục tiêu học tập" (maxLength 50) · select "Loại mục tiêu" (8 types + Chưa đặt)
    ├── select "Mục tiêu JLPT" (N5–N1) · number "Số bài tập mỗi ngày" (min 1 max 20, default 3)
    ├── checkboxes "Ngữ điệu yêu thích" (Thân mật / Lịch sự / Kinh doanh)
    ├── text "Chủ đề yêu thích" (comma separated)
    ├── checkbox "Theo dõi chuỗi luyện tập" (streak)
    ├── checkbox "Trí nhớ học tập" (auto memory)
    ├── ✅ "Đã lưu hồ sơ học tập." / error
    └── primary "Lưu hồ sơ"
```

### 4.14 Analytics (`/analytics`, gated)

```text
ANALYTICS
├── [gated] Card: "Bảng phân tích học tập không khả dụng trong môi trường này…" + underlying error
├── Card "Khoảng thời gian": select (7/14/30/90 ngày, Tất cả thời gian) — drives 8 parallel fetches
├── Card "Tổng quan hoạt động": 11 stat cards (Ngày hoạt động, Tổng bài tập, Bài hoàn thành,
│   Bài được chấm, Bài viết tự do, Phiên mô phỏng, Khám phá, Kịch bản tạo mới,
│   Khuyến nghị hoàn thành, Trí nhớ tạo mới, Mục tiêu hoàn thành)
├── Card "Hồ sơ kỹ năng": skill grid (score/100 + ▲▼▬ trend + delta colored + "N mẫu",
│   "Chưa đủ dữ liệu")
├── Card "Kết quả học tập": same grid (baseline vs current)
├── Card "Hiệu chuẩn độ khó": table (Độ khó · Cấp · Loại bài · Điểm TB · Hoàn thành ·
│   Số lần thử · Nhận định Quá dễ/Quá khó/Phù hợp/Trộn lẫn)
├── Card "Kênh chuyển đổi": table (Giai đoạn · Số lượng · Chuyển đổi %)
├── Card "Hiệu quả AI": overview stat cards + by-task table (Tác vụ · Nhà cung cấp · Lượt gọi ·
│   Thành công · Vượt chất lượng · Độ trễ TB · Dự phòng · Chi phí ước tính $)
│   + cost-by-provider table
├── Card "Hiệu quả tính năng": scenario + difficulty tables (reuses calibration table shape)
├── Card "Khuyến nghị"
│   ├── primary "Chạy phân tích mới" → insights list (finding — action)
│   ├── recommendation rows (finding + priority chip + status chip + action + area/source
│   │   + note; pending rows get buttons: "Chấp nhận" / "Bác bỏ" (secondary) / "Triển khai" (primary))
│   └── "Tạo khuyến nghị nháp": 2 text inputs (Lĩnh vực, Phát hiện) + secondary "Tạo khuyến nghị nháp"
└── Card "Thử nghiệm A/B": experiment rows (name + status chip + allocation% + target/metrics +
    "Gán tôi vào thử nghiệm" + "Phân tích kết quả" + metrics table control vs variant + result line)
```

### 4.15 AI Quality (`/ai-quality`, gated, developer-only)

```text
AI QUALITY
├── [gated] Card: "Bảng điều khiển chất lượng AI không khả dụng…" + error
├── Card "Trạng thái bộ đăng ký": enabled + task count + thresholds line
│   (min confidence, max provider disagreement, max retries, verification, escalation)
│   + task list with criticality labels
├── Card "Đo lường từ xa": totals line + per-task table (Lượt gọi · Thành công · Chất lượng ·
│   Độ trễ TB · Dự phòng · Chi phí ước tính)
├── Card "Điểm chuẩn vàng"
│   ├── select "Nhóm tác vụ" (11 categories) + number input "Giới hạn số trường hợp" (1–200, default 20)
│   ├── primary "Chạy điểm chuẩn" ("Đang chạy...") + error
│   ├── aggregate table (Schema / Nhất quán / Thuộc tính kỳ vọng / Ngữ nghĩa / Ngữ vực / Độ trễ)
│   ├── per-case violations table (✓/✗)
│   └── persisted results table
└── Card "Bộ đăng ký prompt": table (Tác vụ · Phiên bản · Mô tả · Mức độ nghiêm trọng · Chi phí · Schema)
```

### 4.16 History (`/history`)

PageHeader + EmptyState only: "Chưa có lịch sử" / "Lịch sử luyện tập sẽ được hiển thị tại đây trong Phase 2."

---

## 5. Component inventory

### Layout

| Component | Path | Purpose / used in | Props | Variants/states |
|---|---|---|---|---|
| AppLayout | `layouts/AppLayout.tsx` | Shell: brand, sidebar NavLinks, `<Outlet/>`; probes quality + analytics availability | — | Desktop sidebar / mobile top strip (CSS only) |
| PageHeader | `components/PageHeader.tsx` | h1 + description; every page | `title`, `description?` | single style |

### Feedback

| Component | Path | Purpose / used in | Props | Variants/states |
|---|---|---|---|---|
| LoadingSpinner | `components/LoadingSpinner.tsx` | CSS spinner + label; all pages, Suspense fallback | `label?` (default "Đang tải...") | `role="status"` |
| EmptyState | `components/EmptyState.tsx` | Dashed-border empty box; Practice saved list, Challenge, Vocabulary, Memory, History, Simulation aside, Dashboard starter | `title`, `description?` | single style |
| ErrorBoundary | `components/ErrorBoundary.tsx` | Full-screen crash state: "Đã xảy ra lỗi" + buttons "Thử lại" / "Về trang chủ"; root + per-route | `resetKey?` | — |

### AI-driven interactive panels (feature components)

| Component | Path | Purpose | Used by | Props | States |
|---|---|---|---|---|---|
| ExerciseView | `components/ExerciseView.tsx` | Full exercise: editor, attempts history, evaluation, hints, reveal, vocabulary | PracticePage | `exercise`, `editorLabel?`, `editorPlaceholder?` | empty/typing/submitting/evaluated/hint/revealed |
| WritingResults | `components/WritingResults.tsx` | Post-submission long-form + scenario evaluation renderer | FreeWritingPage | `evaluation`, `hints`, `revealed`, `revealAvailable`, `onNextHint`, `onReveal` | evaluated / learning-mode gated / revealed |
| RevisionCompare | `components/RevisionCompare.tsx` | Revision diff: delta bars + sentence diff + AI guidance | FreeWritingPage | `compare`, `onBack` | diff view |
| ScenarioPanel | `components/ScenarioPanel.tsx` | Scenario brief + start | PracticePage | `scenario`, `starting`, `onStart` | generated / starting |
| ChallengePanel | `components/ChallengePanel.tsx` | Challenge: brief, editor, result | PracticePage, ChallengePage | `challenge`, `onResult?` | idle/submitting/success/fail |
| SimulationConversation | `components/SimulationConversation.tsx` | Chat thread, composer, per-turn evaluation, coach | SimulationPage | `session`, `onSessionChange`, `onEnded` | active / ended / guided / immersive |
| SimulationSummaryPanel | `components/SimulationSummaryPanel.tsx` | Session summary + actions | SimulationPage | `sessionId`, `onViewConversation`, `onNew` | loading/loaded |
| JourneyBanner | `components/JourneyBanner.tsx` | Current-journey-objective strip | PracticePage | `context` | hidden when null/error |

### Page-local components (defined inside page files, not reusable)

DashboardPage: `JourneyCard`, `RecommendationCard`, `AnalyticsProgressCard`, `MilestoneList`. JourneyPage: `MasteryBadge`. AnalyticsPage: `SkillGrid`, `SummaryChips`, `CalibrationTable`, `FunnelRows`, `AiTable`, `RecommendationCard`, `ExperimentCard`. AiQualityPage: `AggregateView`. These duplicate patterns across pages (two different `RecommendationCard`s, two `SkillGrid`s, two `CalibrationTable`s).

### Not a component (CSS-only)

Button styles (`primary-button`, `secondary-button`, `mode-button`, `exercise-list-button`, `attempt-chip`, `coach-preset`, `simulation-explain-button`, `writing-issue-jump`, `danger-button`), cards (`.card`), chips (`.exercise-chip`), progress bars (`.score-track`/`.score-fill`), trend stat cards (`.trend-card`), tables (`.provider-table`) — all plain CSS classes applied to raw `<button>/<table>/<div>` elements.

---

## 6. Button inventory

All buttons are native `<button>` (or `<Link>/<a>` styled as buttons — marked 🔗). "Loading" = label swap while disabled; "Success" = inline ok-text or state change; "Error" = nearby error-text paragraph. **No button anywhere has a confirmation step.**

### Dashboard

| Label | Location | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|---|
| Nhận gợi ý bài tập / Làm mới gợi ý | Card 8 | primary / secondary (dynamic) | POST `/learning/next` + refetch today | "Đang tạo..." | while refreshing | **swallowed — no catch** (`DashboardPage.tsx:219`) |
| Đổi nhiệm vụ khác | Card 5 | secondary | POST `/gamification/mission/regenerate` + refetch | "Đang tạo nhiệm vụ mới..." | while regenerating | **swallowed — no catch** (`:229`) |
| Xem lộ trình 🔗 | Card 3 JourneyCard | secondary-styled link | → `/journey` | — | — | — |
| Xem phân tích chi tiết 🔗 | Card 4 | secondary-styled link | → `/analytics` | — | — | — |
| Tạo lộ trình (in-text) 🔗 | Card 3 empty copy | anchor | → `/journey` | — | — | — |

### Practice

| Label | Location | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|---|
| AI gợi ý / Tùy chỉnh / Ngẫu nhiên / Thử thách / Tình huống | mode-selector | toggle buttons (mode-button) | local state switch | — | — | — |
| Luyện tập ngay | AI gợi ý panel | primary | openRecommended: use rec exercise or POST `/learning/next` | "Đang tạo..." | while generating | error line |
| Gợi ý khác | AI gợi ý panel | secondary | POST `/learning/next` + refetch | "Đang tạo..." | while generating | error line |
| Nhận gợi ý bài tập | AI gợi ý panel (no rec) | primary | same as Gợi ý khác | "Đang tạo..." | while generating | error line |
| Tạo bài tập | Tùy chỉnh panel | primary | POST `/exercises/generate` (5 criteria) | "Đang tạo..." | while generating | error line |
| Tạo bài tập ngẫu nhiên | Ngẫu nhiên panel | primary | POST `/exercises/generate` ({}) | "Đang tạo..." | while generating | error line |
| Nhận thử thách | Thử thách panel | primary | POST `/challenges/generate` | "Đang tạo..." | while generating | error line |
| Tạo tình huống mới | Tình huống panel | primary | POST `/scenarios/generate` | "Đang tạo..." | while generating | error line |
| Bắt đầu viết | ScenarioPanel | primary | POST `/scenarios/{id}/exercise` → navigate `/free-writing?exercise=&scenario=` | "Đang chuẩn bị bài tập..." | while starting | error line |
| Bắt đầu hội thoại mô phỏng | Tình huống panel (scenario exists) | primary | navigate `/simulation?scenario=` | — | — | — |
| Hội thoại | per scenario-history row | secondary (scenario-conversation-button) | navigate `/simulation?scenario=` | — | — | — |
| [saved exercise row] | Bài tập đã lưu list | list button (exercise-list-button) | setCurrent(exercise) → renders ExerciseView below | — | — | — |

### ExerciseView (embedded in Practice)

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Gửi bài | primary | POST `/exercises/{id}/attempts` | "AI đang chấm điểm..." | empty answer / submitting | error line |
| [attempt chip] Lần N: score | chip (attempt-chip) | GET attempt (lazy) | — | — | error line |
| Gợi ý tiếp theo | secondary | POST `/attempts/{id}/hint` | — | hidden when hints exhausted | error line |
| Xem đáp án | primary | POST `/attempts/{id}/reveal` | — | hidden until revealAvailable | error line |
| Xem toàn bộ từ vựng → 🔗 | secondary link | → `/vocabulary` | — | — | — |

### Free Writing / Workspace

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Tạo đề tài | primary | POST `/exercises/generate` (free_writing + prefs) | "Đang tạo..." | while generating | error line |
| Gửi bài / Gửi bản sửa | primary | POST `/writing/submissions` or `/revisions` (+ refetch submission + evaluation) | "AI đang chấm điểm..." | empty / submitting | "Không thể đánh giá: …" |
| [revision chip] Bản N: score | chip | GET evaluation (latest) or GET compare | — | — | actionError |
| Gợi ý tiếp theo | secondary | POST `/writing/submissions/{id}/hint` | — | hidden when done | actionError |
| Xem bản viết lại | primary | POST `…/reveal` + refetch evaluation | — | hidden until revealAvailable | actionError |
| [coach presets ×4] | chip (coach-preset) | askCoach preset question | — | while coachLoading | actionError |
| Hỏi trợ lý | primary | POST `…/coach` | "Trợ lý đang trả lời..." | empty / loading | actionError |
| Về bản mới nhất | secondary (in RevisionCompare) | selectRevision(latest) | — | — | actionError |
| Xem câu liên quan | small outline button (writing-issue-jump) | select sentence + scrollIntoView | — | — | — |

### Challenge

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Nhận thử thách / Tạo thử thách mới | primary | POST `/challenges/generate` | "AI đang tạo thử thách..." | while generating | error line |
| Gửi bài (ChallengePanel) | primary | POST `/challenges/{id}/attempts` | "AI đang chấm điểm..." | empty / submitting / **challenge.completed** | error line |

### Simulation

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Bắt đầu hội thoại với tình huống này | primary | POST `/simulations` (preselected scenario) | "Đang bắt đầu..." | while creating | error line |
| Tạo tình huống mới | primary | POST `/scenarios/generate` + POST `/simulations` | "Đang tạo..." | while creating | error line |
| [scenario row] | list button | startSimulation(scenario_id) | — | while creating | error line |
| Hội thoại mới (topbar) | secondary | local reset | — | — | — |
| [history row] | list button | GET `/simulations/{id}` → conversation or summary view | — | — | error line |
| Tới trang luyện tập | secondary | → `/practice` | — | — | — |
| Gửi trả lời | primary | POST `/simulations/{id}/turns` | "AI đang phản hồi..." | empty / sending / ending; shortcut **Ctrl+Enter** | error line |
| Kết thúc hội thoại | secondary | POST turns with `end_early: true` | "Đang kết thúc..." | sending / ending | error line |
| Giải thích chi tiết | per-turn small button | POST `/turns/{id}/explain` | "Đang giải thích..." | while explaining | error line |
| [coach presets ×3] | chip | fills coach question | — | — | — |
| Hỏi | secondary | POST `/simulations/{id}/coach` | "Đang hỏi..." | empty / loading | error line |
| Xem tổng kết | primary (ended note) | switch to summary view | — | — | — |
| Xem lại hội thoại | secondary | switch to conversation view | — | — | — |
| Hội thoại mới (summary) | primary | local reset | — | — | — |
| Nhận thử thách gợi ý | primary | → `/challenge` | — | only when `suggested_challenge` | — |

### Vocabulary

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Tìm | secondary | applies search (Enter also works) | — | while search == applied | — |
| Xem 🔗 | secondary link per row | → `/vocabulary/{id}` | — | — | — |
| ← Quay lại ngân hàng từ vựng 🔗 | secondary link | → `/vocabulary` | — | — | — |

### Journey

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Tạo lộ trình | primary | POST `/learning/journey` | "Đang tạo..." | while creating | error line |
| Tạo lại lộ trình | secondary | POST `/learning/journey` `force_regenerate: true` — **no confirmation** | "Đang tạo..." | while creating | error line |
| Đi luyện tập ngay 🔗 | primary link | → `/practice` | — | — | — |

### Memory

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Lưu ghi nhớ | primary | POST `/learning/memory` | "Đang lưu..." | empty / creating | error line |
| Rà soát lại | secondary | POST `/learning/memory/refresh` | "Đang làm mới..." | while refreshing | actionError |
| Lưu trữ | secondary (memory-action, **unstyled**) | POST `/learning/memory/{id}/archive` | — | — | actionError |
| Quên | **danger-button — class has no CSS, renders as unstyled default button** | DELETE `/learning/memory/{id}` — **destructive, no confirmation** | — | — | actionError |

### Settings

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Lưu cấu hình | primary | PUT `/ai/providers/config` | "Đang lưu..." | while saving | error line |
| Tải danh sách mô hình | primary | GET `/ai/models` (30 s client timeout) | spinner in card | — | error line |
| Làm mới | secondary | GET `/ai/models` again | spinner in card | — | error line |
| Lưu hồ sơ | primary | PUT `/learning/profile` | "Đang lưu..." | while saving | error line |

### Analytics (gated)

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Chạy phân tích mới | primary | POST `/analytics/analyze` | "Đang phân tích..." | while analyzing | draftMessage line |
| Chấp nhận / Bác bỏ | secondary | POST `/analytics/recommendations/{id}/decision` | — | while deciding | draftMessage |
| Triển khai | primary | same decision endpoint | — | while deciding | draftMessage |
| Tạo khuyến nghị nháp | secondary | POST `/analytics/recommendations/draft` | — | empty fields | draftMessage |
| Gán tôi vào thử nghiệm | secondary | POST `/analytics/experiments/{id}/assign` | "Đang gán..." | while assigning | inline result/error |
| Phân tích kết quả | secondary | POST `/analytics/experiments/{id}/analyze` | "Đang phân tích..." | while analyzing | inline result/error |

### AI Quality (gated, dev)

| Label | Type | Action / API | Loading | Disabled | Error |
|---|---|---|---|---|---|
| Chạy điểm chuẩn | primary | POST `/ai/benchmark/run` + GET results | "Đang chạy..." | while running | benchmarkError |

### ErrorBoundary

| Label | Type | Action |
|---|---|---|
| Thử lại | primary-styled | reset boundary state |
| Về trang chủ | primary-styled | `window.location.assign('/')` |

---

## 7. Form / input inventory

There is no form library and no `<form>` element anywhere — inputs are plain elements with `onChange` state and disabled-button submission. No inline validation messages; validity is enforced by `min`/`max`/`maxLength` attributes and by disabling the submit button. Errors appear after API failure.

### Textareas

| Input | Page | Label / placeholder | Default | Limits | Submit | Notes |
|---|---|---|---|---|---|---|
| Exercise answer (rows 5) | ExerciseView | "Câu trả lời tiếng Nhật của bạn" / "Viết câu trả lời tiếng Nhật ở đây..." | empty | none | Gửi bài | disabled when blank |
| Workspace editor (rows 8) | FreeWriting | "Bài viết tiếng Nhật của bạn" | restores from localStorage draft | none | Gửi bài / Gửi bản sửa | 400 ms autosave; char counter `[...answer].length chữ` |
| Coach question (rows 3) | FreeWriting | aria "Câu hỏi cho trợ lý" / "Viết câu hỏi của bạn ở đây..." | empty | none | Hỏi trợ lý | |
| Challenge answer (rows 5) | ChallengePanel | "Câu trả lời tiếng Nhật của bạn" | empty | none | Gửi bài | disabled when completed |
| Simulation turn (min-height 90px) | SimulationConversation | "Nhập câu trả lời tiếng Nhật của bạn..." | empty | none | Gửi trả lời (Ctrl+Enter) | disabled while sending |
| Coach input (flexible) | SimulationConversation | "Hỏi bất kỳ điều gì về hội thoại..." | empty | none | Hỏi | single-line input element |

### Text inputs

| Input | Page | Placeholder | Limits | Notes |
|---|---|---|---|---|
| Search | Vocabulary | "Tìm theo từ, âm đọc hoặc nghĩa..." | — | Enter submits; "Tìm" disabled while unchanged; other filters apply instantly |
| Memory content | Memory | "VD: Tôi muốn tập trung vào viết email công việc" | maxLength 500 | |
| Memory importance | Memory | — | number min 1 max 10, default "7", clamped client-side | |
| Learning goal | Settings | "VD: Thi JLPT N3 trong 6 tháng" | maxLength 50 | |
| Preferred topics | Settings | "VD: Công việc, Du lịch, Ẩm thực (phân cách bằng dấu phẩy)" | — | split on comma client-side |
| Gemini key | Settings | "AIza..." | — | `type=password`, cleared after save; label shows masked status |
| Groq key | Settings | "gsk_..." | — | `type=password` |
| Ollama URL | Settings | "http://127.0.0.1:11434" | — | blank keeps current |
| Draft area | Analytics | "vd: curriculum_effectiveness" | — | |
| Draft finding | Analytics | "Mô tả ngắn gọn vấn đề quan sát được" | — | |
| Benchmark limit | AI Quality | — | number min 1 max 200, default "20" | |

### Selects (all native `<select>`)

| Select | Page | Options |
|---|---|---|
| Loại bài tập | Practice | Ngẫu nhiên / Dịch câu / Dịch nhiều câu / Dịch đoạn văn / Viết tự do / Thử thách ngữ điệu |
| Ngữ điệu | Practice, FreeWriting | Ngẫu nhiên (hoặc "AI tự chọn") / Thân mật / Lịch sự / Kinh doanh |
| JLPT | Practice, Vocabulary, Settings | Ngẫu nhiên / Mọi trình độ / Chưa đặt + N5–N1 |
| Độ khó | Practice | Ngẫu nhiên + 1/10…10/10 |
| Độ dài | Practice, FreeWriting | Ngẫu nhiên / AI tự chọn / 1 câu ngắn / 1 câu / 2–3 câu / Đoạn văn / Bài viết dài (subset on FreeWriting) |
| Loại từ vựng | Vocabulary | Tất cả loại / Từ / Cụm từ / Kết hợp từ |
| Ngữ điệu (vocab filter) | Vocabulary | Mọi ngữ điệu + 4 registers |
| Mục tiêu (journey) | Journey (×2: create + change) | 8 goal types |
| Loại ghi nhớ | Memory | 11 categories |
| Loại mục tiêu / Mục tiêu JLPT | Settings | 8 goal types + Chưa đặt; N5–N1 + Chưa đặt |
| Khoảng thời gian | Analytics | 7/14/30/90 ngày / Tất cả thời gian |
| Nhóm tác vụ (benchmark) | AI Quality | Tất cả + 11 categories |

### Radios / checkboxes

| Control | Page | Items | Default |
|---|---|---|---|
| Radio (mode) | Simulation | "Có hướng dẫn — phản hồi chi tiết…" / "Đắm chìm — không phản hồi…" | guided |
| Checkbox (registers) | Settings | Thân mật / Lịch sự / Kinh doanh | profile values |
| Checkbox (streak) | Settings | "Ghi nhận chuỗi ngày luyện tập liên tục (streak)" | true |
| Checkbox (memory) | Settings | "Tự động ghi nhớ các mẫu lỗi, điểm mạnh…" | true |

### Filters / search summary

Vocabulary is the only searchable/filterable list (search + 3 filters, instant refetch, `limit: 50`). Memory list fetches `limit: 100` with **no filter UI** (backend supports category/status). No pagination UI exists anywhere. No sliders, no toggles (streak/memory are checkboxes), no character counter other than the FreeWriting one.

---

## 8. State inventory

### Exercise generation (Practice, all modes)
```
idle → generating ("AI đang tạo bài tập...") → generated (ExerciseView/ChallengePanel/ScenarioPanel) → error ("Không thể tạo bài tập: …")
```

### Attempt submission (ExerciseView / ChallengePanel)
```
empty → typing → submitting ("AI đang chấm điểm...") → evaluated (score + issues + hints) → hinting (Gợi ý tiếp theo) → revealAvailable → revealed (Đáp án) → error
```
Note: the editor is NOT reset after submission; the same textarea stays for retry. Attempt chips allow browsing previous evaluations; progress hint compares to previous attempt.

### Free-writing workspace
```
empty → typing (autosave) → submitting → evaluated (WritingResults) → revising (Gửi bản sửa) → new revision
hints: 0 → N → revealAvailable → revealed (rewrites visible)
revision browse: latest (evaluation) ↔ older (RevisionCompare)
coach: idle → asking ("Trợ lý đang trả lời...") → answered (coach-answer)
```

### Simulation
```
setup (mode radio) → creating → active (thread) → turn submitting ("AI đang phản hồi...") → evaluated (guided) / silent (immersive) → explain (guided) → ended (end_early or budget) → summary → new session
resume: history row → reloads session → conversation (active) or summary (closed)
```

### Scenario (Practice)
```
idle → generating ("Đang tạo...") → generated (ScenarioPanel) → starting ("Đang chuẩn bị bài tập...") → navigate to workspace
```

### Dashboard
```
mount → 6 independent loads (per-card spinners) → data/error per card
recommendation: none → generating ("Đang tạo...") → generated / silent failure (no catch)
mission: none → generated → regenerating ("Đang tạo nhiệm vụ mới...")
```

### Journey
```
no journey → creating ("Đang tạo...") → journey view → replanning ("Tạo lại lộ trình")
objective explanation: async per active objective (MasteryBadge)
```

### Memory
```
list loading → rows / empty
create: idle → saving ("Đang lưu...") → ✅ "Đã lưu ghi nhớ." / error
refresh: idle → refreshing ("Đang làm mới...") → result line ("Đã xử lý N sự kiện…")
archive/forget: immediate, optimistic-less (refetch after) — no confirmation, no per-row loading state
```

### Settings
```
load: providers/config/profile in parallel
save config: idle → saving ("Đang lưu...") → ✅ "Đã lưu cấu hình." / error
save profile: idle → saving → ✅ "Đã lưu hồ sơ học tập." / error
models: none → loading ("Tải danh sách mô hình") → list / per-provider error → refreshing
```

### Analytics / AI Quality (gated)
```
gate probe → gated card (404) or full page
analyze: idle → analyzing ("Đang phân tích...") → insights + recommendations
benchmark: idle → running ("Đang chạy...") → aggregate + per-case + persisted results / error
```

### Global
```
route navigation: Suspense → LoadingSpinner (lazy pages)
page crash: ErrorBoundary full-screen → "Thử lại" / "Về trang chủ"
API failure: ApiError (status/code/message) → error-text paragraph
```

---

## 9. User flows

### Normal practice
```
Dashboard (Gợi ý hôm nay)
→ Practice → AI gợi ý → "Luyện tập ngay" (or Tùy chỉnh / Ngẫu nhiên)
→ ExerciseView (prompt → editor)
→ Gửi bài → evaluation (score, 6 bars, issues, hints)
→ Gợi ý tiếp theo → Xem đáp án → retry in same editor → next attempt chip
→ saved into "Bài tập đã lưu"
```

### Long-form writing
```
Free Writing → Tạo đề tài (register/length) → workspace
→ write (autosave) → Gửi bài → WritingResults (sentence + discourse + strengths + structure)
→ Gợi ý cải thiện → Xem bản viết lại → edit → Gửi bản sửa → revision chip
→ older chip → RevisionCompare → "Về bản mới nhất"
→ Trợ lý viết AI (preset or free question)
```

### Scenario
```
Practice → Tình huống → Tạo tình huống mới → ScenarioPanel
→ Bắt đầu viết → /free-writing?exercise=&scenario= → scenario reminder above editor
→ Gửi bài → WritingResults + "Đánh giá theo tình huống" (5 bars + required-point checklist + format checklist + professional rewrite)
→ or Bắt đầu hội thoại mô phỏng → /simulation?scenario=
```

### Simulation
```
Scenario → Bắt đầu hội thoại mô phỏng (or Simulation page: mode radio → Tạo tình huống mới / recent list / history resume)
→ banner → thread → turn (Ctrl+Enter) → per-turn evaluation (guided) / silent (immersive)
→ Giải thích chi tiết / Hỏi trợ lý
→ Kết thúc hội thoại (or budget exhausted) → Xem tổng kết → dimensions, compare, strengths/needs-work
→ Nhận thử thách gợi ý → /challenge
```

### Vocabulary
```
Evaluation (ExerciseView "✨ Từ vựng đáng học") → Vocabulary Bank (search/filter)
→ Xem → detail (reason, example, alternatives, usage stats, Xuất xứ, Thông tin kỹ thuật)
```

### Journey
```
Dashboard "Tạo lộ trình" → Journey (goal select → Tạo lộ trình)
→ milestones/objectives → Practice (JourneyBanner shows active objective) → exercises
→ evidence feeds mastery → objective progress bars → Tạo lại lộ trình (replan)
```

### Memory
```
Settings toggle → automatic ingestion from evaluations/vocabulary/scenarios/simulations
→ Memory page: Rà soát lại (refresh) → rows → Lưu trữ / Quên (manual create optional)
```

---

## 10. Current design system (as implemented)

All values are the literal values in `src/index.css` / JSX. Single light theme; **no dark mode** (`color-scheme: light`).

### Color palette (CSS variables, `:root`)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#f4f6fb` | page background |
| `--surface` | `#ffffff` | cards, inputs, bubbles (AI) |
| `--border` | `#e3e8f0` | card/input/table borders |
| `--text` | `#1c2333` | primary text |
| `--text-muted` | `#6b7280` | secondary text |
| `--primary` | `#4f46e5` (indigo) | primary buttons, active nav, fills, links, user bubble |
| `--primary-soft` | `#eef0ff` | chips, active states, score-overall bg, coach-answer bg |
| `--danger` | `#dc2626` | errors, negative deltas, worse bars |
| `--ok` | `#16a34a` | success text |
| `--sidebar-bg` | `#141b2e` | dark sidebar |
| `--sidebar-text` | `#cbd5e1` | sidebar links |
| `--sidebar-active` | `#ffffff` | brand + active link |

**Undefined variables used anyway:** `--text-strong` (`.vocabulary-expression`), `--surface-2` (`.familiarity-new`) — no fallback, inherit/transparent silently. `--muted` is always used with fallback `#6b7280`.

**Hard-coded literals (not tokens):** familiarity chips (amber `#b7791f` on `rgba(240,173,78,.18)`, green `#276749` on `rgba(72,187,120,.18)`, blue `#2b6cb0` on `rgba(66,153,225,.18)`), diff colors (ok/danger/`#b7791f`), white AI bubbles, white-on-indigo user bubbles.

### Typography
- Stack: `'Segoe UI', 'Helvetica Neue', Arial, sans-serif` — system fonts only, **no webfonts, no Japanese font stack** (relies on OS fallback), no `@font-face`.
- Sizes in use (px): 30 (score), 26 (page h1), 24 (journey %), 22 (mobile h1), 20 (trend value), 17 (prompt, empty h3, expression), 16 (card h2, mission title, milestone title), 15 (brand, prompt, memory title), 14 (body/buttons), 13 (muted, labels, table headers), 12 (chips, tagline, meta), 11 (severity chips, bubble meta).
- Weights: 400 default, 600 (ok-text, labels, chips), 700 (brand, expressions, titles), 800 (journey percent).
- Line heights: 1.5–1.7 on reading text.

### Spacing
- Content padding: `32px 40px` desktop; `20px 16px` ≤900px; `16px 12px` ≤480px. Sidebar padding `24px 16px`.
- Card: `padding 20px 24px; margin-bottom 24px`. Buttons `10px 18px`; inputs `8–12px` padding. Gaps: 4/6/8/10/12/16/24 px flex/grid gaps.

### Radii
12 px (cards), 10 px (score-overall, banners, coach/summary boxes), 8 px (buttons, inputs, list buttons, issue items, nav), 999 px (chips/pills/bars), 6 px (explain button).

### Shadows
**None anywhere.** Depth comes solely from border + background color.

### Progress bars
`.score-track` (10 px, pill, `--border` bg) + `.score-fill` (primary, `transition: width .4s ease`). Variant `.score-fill-worse` (danger). Used for: XP, daily goal, journey, mastery, skill bars, sim summary, revision deltas (RevisionCompare uses `50 + delta` as the width — can exceed 100 visually, clamped in style).

### Components & shapes
- Cards: white, 1 px border, 12 px radius, stacked with 24 px bottom margin. Max content width **960 px**.
- Tables: `.provider-table` — full width, `8px 10px` cells, bottom borders, muted 13 px headers.
- Chips: `.exercise-chip` (pill, soft-indigo bg, indigo text, 12 px 600), `.attempt-chip` (outline pill, active = soft-indigo + indigo border), `.familiarity-chip` (4 colored variants), `.mode-button` (outlined, active = primary border + tint), `.coach-preset` (outline pill).
- Trend cards: `.trend-card` — bordered box, centered, big primary number + muted caption; used on Dashboard and Analytics.
- Bubbles: AI = white + border, left; user = indigo + white text, right; max-width 88 % (100 % ≤900px).
- Empty state: dashed border, centered, h3 + muted paragraph.
- Loading: 18 px CSS border spinner (2 px, `--primary-soft` bg ring, `--primary` top, `0.8s` linear spin) + label.

### Icons
**Emoji only**, hard-coded in JSX: 🏅 (milestones), ✅ (success/checklists), ❌ (issues), ⚠️ (naturalness), 💼 (register issues), 💡 (optional points), 🚫 (forbidden), ✨ (vocabulary header), ◐ (partial), ▲▼▬ (trends), →/← (links/back). No SVG icon set in components (only `public/icons.svg` referenced nowhere in source, `public/favicon.svg` as favicon).

### Breakpoints
Only two: `max-width: 900px` and `max-width: 480px` (details in §11). No container queries, no print styles.

---

## 11. Responsive behavior (as actually implemented)

Only three media queries exist in the whole app (`index.css:1601, 1834, 1889`).

| Breakpoint | Changes |
|---|---|
| **≤900px** | `.app-shell` → column; `.sidebar` → full-width sticky top bar (`position: sticky; top: 0; z-index: 10`), horizontal flex row; `.brand` → row; `.brand-tagline` hidden; `.nav` → horizontal row with `overflow-x: auto` + hidden scrollbar; `.nav-link` nowrap 8px/10px; `.content` padding `20px 16px`; `.provider-table` → `display:block; overflow-x: auto` (horizontal scroll); `.simulation-layout` → single column; `.simulation-bubble` max-width 100 % |
| **≤480px** | `.content` padding `16px 12px`; `.page-header h1` 22 px; `.brand-name` 13 px |

What does **not** exist: hamburger/menu drawer, mobile-specific controls, sticky elements besides the nav bar, table → card conversions (tables just scroll horizontally), no `min-width` handling for the mode-selector row (wraps via flex-wrap), no mobile-specific hiding of coach panels or evaluation blocks.

Net mobile behavior: the entire sidebar becomes a horizontally scrolling tab strip of 10–12 text links; all page content simply stacks (cards were already stacked); the simulation page collapses to one column (history aside moves below the conversation); tables scroll horizontally. Nothing else adapts.

---

## 12. AI-specific UI

Everything that renders AI output, in one place:

| Element | Where | Content | Special UX |
|---|---|---|---|
| Recommendation card | Dashboard Card 8, Practice AI gợi ý | `reason`, topic, JLPT/difficulty, focus skills, prompt preview | two near-duplicate implementations |
| JourneyBanner | Practice | active objective + competencies + mastery + link | hidden when context null/error |
| Daily mission | Dashboard Card 5 | title/description/x-of-y + regenerate | lazily AI-generated; regenerate archives |
| Milestone celebrations | Dashboard Card 6 | italic AI message under milestone | |
| Encouragement | Dashboard Card 2 | 💬 one-liner | |
| Mastery explanation | Journey active objective | `summary_vi` from `/objectives/{id}/explanation` | fetched per objective |
| Journey explanation | Journey summary card | AI narrative of the plan | |
| Coach (writing) | FreeWriting | preset chips + free question → answer + suggestions | contextual with profile + vocabulary |
| Coach (simulation) | Simulation | presets + free question → answer + suggestions | |
| Per-turn explain | Simulation | deep explanation per user turn | guided only |
| Scenario brief | ScenarioPanel + workspace reminder | situation/context/points/forbidden | duplicated between the two surfaces |
| Scenario evaluation | WritingResults | 5 dimension bars + checklist + format + professional rewrite | scenario-linked exercises only |
| Rewrites (3-tier) | WritingResults / ExerciseView | minimal/natural/native (+professional) | gated behind learning mode |
| Hints (progressive) | ExerciseView / WritingResults / Simulation | 1..N revealed one at a time | deterministic, gated |
| Vocabulary learning reasons | ExerciseView list, Vocabulary detail | "Vì sao nên học từ này?" | provenance-tracked |
| Simulation summary | SimulationSummaryPanel | narrative + dimensions + compare + challenge suggestion | AI or system fallback labeled |
| Challenge | ChallengePanel | instruction/source/required expression + XP | success is deterministic |
| Skill/difficulty analytics | AnalyticsPage | trend arrows, deltas, verdicts | — |
| Telemetry/cost tables | AnalyticsPage, AiQualityPage | per-task/provider success/latency/cost | privacy-safe, developer-only |
| Golden benchmark runner | AiQualityPage | aggregate rates + per-case violations | developer-only, deterministic |
| Prompt registry | AiQualityPage | 62 prompt entries table | developer-only |
| Profile synthesis | Dashboard "Hồ sơ học tập" | evidence count, JLPT band, trends, strengths/weaknesses | numbers deterministic, AI framing |

Loading pattern for AI work: spinner + Vietnamese label ("AI đang tạo bài tập...", "AI đang chấm điểm...", "AI đang phản hồi...", "Trợ lý đang trả lời...", "Đang phân tích hồ sơ học tập..."). Degradation is signaled by visible chips/lines ("Chỉ chấm từng câu", "Phân tích mạch văn tạm thời không khả dụng", "Tổng kết hệ thống", "Tổng kết do AI tạo").

---

## 13. UX issues (evidence-based, no redesign proposed)

| # | Problem | Location | Evidence | Impact | Priority |
|---|---|---|---|---|---|
| 1 | **Corrupted Vietnamese labels** in the two conditional nav items | `AppLayout.tsx:59–60` | Literal mojibake `Ch���t l�����ng AI` and `Phǽn t��ch` in source; the 10 static labels are correct | Broken branding on developer pages | P1 |
| 2 | **Undefined CSS classes → unstyled UI** | MemoryPage (whole list + buttons), JourneyPage (`.status-ok`, wrappers), AnalyticsPage (`.recommendation-item`) | Classes used in TSX but absent from `index.css`: `.memory-toolbar`, `.memory-item*`, `.memory-category`, `.confidence-chip`, `.memory-action`, `.danger-button`, `.recommendation-item`, `.status-ok`, `.journey-page`, `.journey-milestones` | Destructive "Quên" renders as a plain unstyled button; memory rows have no card/list styling; journey status text unstyled | P1 |
| 3 | **Silent failures / unhandled rejections** on Dashboard | `DashboardPage.tsx:219–237` | `refreshRecommendation` and `regenerateMission` have `try/finally` with no `catch` | User clicks → nothing visible on failure | P1 |
| 4 | **Dead-end nav item** | `/history` | Page renders a placeholder empty state referencing "Phase 2" | 1 of 10 permanent nav items leads nowhere | P1 |
| 5 | **No confirmation anywhere** | Memory "Quên", Simulation "Kết thúc hội thoại", Journey "Tạo lại lộ trình", Mission "Đổi nhiệm vụ khác" | No confirm dialog exists in the codebase; all actions fire immediately | Destructive/irreversible actions are one click away (mission regenerate archives; journey replan replaces the plan) | P1 |
| 6 | **Duplicate, divergent recommendation UIs** | Dashboard Card 8 vs Practice "AI gợi ý" | Two separate `RecommendationCard` implementations with different labels/buttons ("Làm mới gợi ý" vs "Gợi ý khác"), different error handling | Inconsistent terminology and behavior for the same feature | P1 |
| 7 | **Unclear primary action on Practice** | Practice card | 5 equally-styled mode buttons + up to 2 primary buttons in a row ("Luyện tập ngay" + "Gợi ý khác" is a primary/secondary pair, but empty state swaps to primary) | Multiple competing CTAs; mode confusion | P2 |
| 8 | **Dashboard overload: 8 stacked cards** | `/` | 8 cards each with own loading/error; max-width 960 px single column; 6 parallel API calls on mount | Long scroll, no hierarchy, no quick-scan overview | P2 |
| 9 | **Undefined CSS variables** | `index.css` | `var(--text-strong)` and `var(--surface-2)` used but never defined (silently inherit/transparent) | Vocabulary expression color and "Mới" chip background are unintentional | P2 |
| 10 | **Misleading revision delta bar** | `RevisionCompare.tsx:35` | Bar width = `50 + delta` (min 0 max 100 via style clamp) | Bar does not represent the delta relative to 0–100 | P2 |
| 11 | **Silent list-API failures** | `ExerciseView.tsx:102–128` | `listAttempts`/`listAttemptVocabulary` catch and empty the state | History silently missing | P2 |
| 12 | **No pagination anywhere** | Practice (50), Vocabulary (50), Memory (100), Simulation (10) | Fixed `limit` params, no "load more"/paging controls | Large banks unfindable | P2 |
| 13 | **Vocabulary filters under-exposed** | `/vocabulary` | API supports `difficulty_min/max`, `source_type`; UI exposes only type/JLPT/register/search | Filtering mismatch | P2 |
| 14 | **Terminology inconsistency** | across app | "Ngữ điệu" used for *register* everywhere ("Đúng phong cách"/"Phù hợp ngữ điệu"); "Độ dài" for *target length*; "Ngẫu nhiên" means different things (random exercise vs "no preference" in selects) | Confusion on custom mode ("Ngẫu nhiên" as first option = unset) | P2 |
| 15 | **Emoji-as-icons inconsistency** | all pages | Mixed ✅/❌/⚠️/💼/🏅/✨/🚫/💡/◐/▲▼▬ with no consistent system | Visual language varies; colorblind-hostile ✅/❌ | P2 |
| 16 | **Evaluation overload after submission** | ExerciseView, WritingResults | Score block + 6 bars + issues + hints + corrections + vocabulary all in one expanding card below a 120 px editor | Feedback competes with the editor; long pages | P1 |
| 17 | **Learning-mode gating UX is text-only** | ExerciseView/WritingResults | Hints/reveal state conveyed by button presence + one muted nudge line | State of "what is still hidden" is unclear | P2 |
| 18 | **Settings mixes 4 concerns** | `/settings` | AI providers + API keys + models + learner profile in one long page | Developer settings mixed with learner settings | P2 |
| 19 | **Startup probe requests** | `AppLayout.tsx:22–54` | 2 extra API calls on every app boot to decide nav visibility | Latency + failure noise | P2 |
| 20 | **Mobile nav strip cramming** | ≤900 px | 10–12 labels in one horizontal scroll strip with no icons or grouping | Poor discoverability on mobile | P2 |
| 21 | **No empty/loading differentiation for coach** | FreeWriting coach | Coach section always renders after evaluation; only answer box appears on response | No loading placeholder for the coach area itself | P2 |
| 22 | **Linked buttons vs buttons inconsistency** | multiple | "Xem lộ trình"/"Xem phân tích chi tiết"/"Đi luyện tập ngay" are `<a>` with button classes; vocabulary rows are not clickable but have a "Xem" button | Mixed affordances | P2 |

---

## 14. Functional constraints the redesign MUST preserve

1. **Japanese writing must remain the primary action** on every exercise/challenge/workspace/simulation screen — editor prominence, Vietnamese prompt, submit-first flow.
2. **AI feedback must not overwhelm the editor** — after submission the editor stays available for retry (ExerciseView) / revision (workspace).
3. **Learning mode must hide corrections** — hints revealed one at a time; rewrites/corrections only after explicit "Xem đáp án"/"Xem bản viết lại" or reveal-available state. The redesign must keep this gating flow intact (it is server-enforced: corrections are only returned when allowed).
4. **Scenario context must remain visible while writing** — the scenario reminder (situation, required points, forbidden patterns) is shown above the editor via the `?exercise=&scenario=` deep link.
5. **Simulation chat must preserve conversation state** — sessions are server-persisted with a state machine (stage, unresolved items, facts, decisions); reload/resume must keep the thread intact; guided vs immersive must keep hiding feedback in immersive mode until summary.
6. **Dashboard must surface today's recommendation** and today's mission, streak/XP/daily goal, journey status, and monthly progress — currently 8 cards; content must not be lost even if hierarchy changes.
7. **Journey objective must remain connected to exercises** — the JourneyBanner on Practice links recommendations to the active objective; the "Đi luyện tập ngay" CTA.
8. **Developer diagnostics must remain separate from normal UX** — `/ai-quality` and `/analytics` are gated by backend probes and self-gate with 404 notices; nav entries must stay conditional.
9. **Deep-link contracts must keep working**: `/free-writing?exercise={id}&scenario={id}`, `/simulation?scenario={id}`, `/vocabulary/:id`.
10. **Draft autosave** per exercise via `localStorage` (key `draft:free-writing:{exerciseId}`) must survive redesign of the workspace.
11. **Terminology anchors** (Vietnamese labels): AI gợi ý / Tùy chỉnh / Ngẫu nhiên / Thử thách / Tình huống / Viết tự do / Lộ trình / Trí nhớ / Mô phỏng / Đánh giá theo tình huống / Gợi ý / Xem đáp án.
12. **State transparency** for AI-generated content: provenance chips, "Chỉ chấm từng câu", "Tổng kết hệ thống/AI", threshold lines — developer-relevant labels must stay available.
13. **XP/streak/level mechanics** must stay visible and award feedback (daily goal completion line, challenge +XP, milestone medals).
14. **Learning-mode semantics preserved for free writing**: revision timeline (chips), compare view, coach panel only appear after the first submission.
15. **No auth**: single learner; no user-switching UI needed.

---

## 15. Recommended design priorities (for the upcoming redesign — no redesign performed here)

1. Fix the two broken nav labels and undefined CSS classes/variables before redesign (correctness first).
2. Consolidate the two recommendation UIs into one pattern (terminology, states, error handling).
3. Establish a real component system: Button (primary/secondary/danger/ghost), Card, Chip, ScoreBar, StatCard, EmptyState, LoadingState, Table — all currently CSS-class-only.
4. Give each page one clear primary CTA and a consistent action hierarchy; retire double-primary toolbars.
5. Define an icon system (replace emoji), a tokenized color scale, and a typographic scale in CSS variables.
6. Introduce confirmation flows for destructive actions (forget memory, end simulation, regenerate mission, replan journey) and add per-row loading feedback.
7. Rebalance the evaluation result layout so the editor stays visible/dominant and feedback is collapsible or side-by-side.
8. Redesign the dashboard as a compact overview grid while keeping all 8 content areas.
9. Add real pagination/load-more to long lists (vocabulary, exercises, memories, simulation history).
10. Plan a mobile navigation pattern beyond the horizontal scroll strip (e.g., grouped menu or drawer), and responsive treatment for tables and the mode selector.

---

# Design Handoff Summary

- **Total routes:** 13 (12 real pages + `*` redirect to `/`).
- **Total major pages:** 13 — Dashboard, Practice, Free Writing, Challenge, Simulation, Vocabulary, Vocabulary Detail, Journey, History (placeholder), Memory, AI Quality (gated), Analytics (gated), Settings.
- **Total major interactive components:** 25 — 8 shared AI/feature panels (ExerciseView, WritingResults, RevisionCompare, ScenarioPanel, ChallengePanel, SimulationConversation, SimulationSummaryPanel, JourneyBanner), 4 layout/feedback primitives (PageHeader, LoadingSpinner, EmptyState, ErrorBoundary), AppLayout, + 12 page-local components (JourneyCard, RecommendationCard ×2, AnalyticsProgressCard, MilestoneList, MasteryBadge, SkillGrid, SummaryChips, CalibrationTable, FunnelRows, AiTable, ExperimentCard, AggregateView).
- **Total primary flows:** 6 — Practice, Long-form writing, Scenario, Simulation, Vocabulary, Journey.
- **Current navigation structure:** single fixed 260 px dark sidebar, 10 static + 2 probe-gated NavLinks, no top bar/breadcrumbs/tabs/footer; mobile = sticky horizontal scroll strip.
- **Top 10 UX problems:** (1) mojibake nav labels, (2) undefined CSS classes/variables, (3) silent failures on Dashboard actions, (4) dead-end History page, (5) zero confirmation flows, (6) duplicated divergent recommendation UI, (7) competing primary CTAs on Practice, (8) 8-card dashboard overload, (9) misleading revision delta bars, (10) no pagination anywhere.
- **Top 10 redesign priorities:** (1) correctness fixes, (2) consolidate recommendation UI, (3) real button/card/chip/bar component system, (4) single primary CTA per page, (5) icon + token + type system, (6) confirmation & per-action feedback, (7) evaluation layout that keeps the editor dominant, (8) compact dashboard grid, (9) list pagination, (10) mobile navigation redesign.
- **Design constraints that must not be broken:** Japanese writing stays the primary action; learning mode hides corrections until hint/reveal; scenario context stays visible while writing; simulation preserves conversation state (guided/immersive); dashboard surfaces today's recommendation, mission, XP/streak/daily goal, journey and progress; journey objective stays connected to exercises; developer diagnostics stay gated and separate; deep links `/free-writing?exercise=&scenario=` and `/simulation?scenario=` keep working; per-exercise draft autosave keeps working; all UI copy remains Vietnamese; no auth.