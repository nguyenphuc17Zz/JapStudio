# UI Phase 5 — Real-world Scenarios, Simulation & Challenge Experience

Trạng thái: **hoàn thành** · Phạm vi: `apps/web`

Phase 5 hoàn thiện trải nghiệm luyện tập **tình huống thực tế**: tạo tình huống (scenario) → viết phản hồi trong Writing Studio (deep-link) hoặc **mô phỏng hội thoại nhiều lượt** (simulation) → **thử thách từ vựng/ngữ pháp** (challenge) → tổng kết buổi luyện với đề xuất thử thách kế tiếp.

## 1. Cấu trúc thư mục

```
src/pages/ScenarioPage.tsx             — tạo/lọc tình huống, lịch sử gần đây, deep-link ?scenario=
src/pages/SimulationPage.tsx           — mô phỏng: setup → hội thoại → feedback → tổng kết
src/pages/ChallengePage.tsx            — thử thách: landing → làm bài → kết quả, deep-link ?challenge=
src/hooks/useSimulationSession.ts      — FSM mô phỏng + autosave nháp (localStorage 'sim-draft:{id}')
src/hooks/useChallengeSession.ts       — FSM thử thách
src/components/realworld/
  ScenarioMeta.tsx / ScenarioContext.tsx / ScenarioObjective.tsx
  RequiredPoints.tsx (kép: pre-write & post-write, aria-live, giải thích mở rộng)
  OptionalPoints.tsx / ConstraintList.tsx / ScenarioLanding.tsx
  CompletionSummary.tsx                — eyebrow + 3 ô thành tích + deltas
  ScenarioContextView.tsx              — thay ScenarioPanel trong PracticePage
  ChallengeWorkspace.tsx               — landing → editor → result (XP, glow, Thử lại)
  simulation/                          — 10 component: Header/Goal/Thread/Message/TurnFeedback/
                                          Composer/History/Setup/CoachPanel/Summary
  labels.ts                            — genreLabel/mediumLabel/challengeTypeLabel…
src/components/writing/studio/
  ScenarioResults.tsx                  — review tab: fit + dimensions + yêu cầu + định dạng + bản chuyên nghiệp
  GenreFields.tsx                      — email (subject+body) / bug report (5 trường) / text
src/lib/scenarioText.ts                — parse/assemble email (件名：…) & bug report (【概要】…)
src/components/realworld/ScenarioCompleteBanner.tsx — XP + điểm fit sau nộp bài
src/styles/realworld.css               — jw-rw-*, jw-sim-*, jw-ch-*, jw-studio-scenario-*, genre, banner
src/test/ScenarioPage.test.tsx         — 5 test mới
src/test/ScenarioStudio.test.tsx       — 3 test mới (genre fields, results, banner, XP diff)
src/test/SimulationPage.test.tsx       — 4 test viết lại theo UX mới
src/test/ChallengePage.test.tsx        — 5 test viết lại theo UX mới
```

Đã xóa (kế thừa cũ của Phase 3): `components/ScenarioPanel.tsx`, `components/ChallengePanel.tsx`, `components/SimulationConversation.tsx`, `components/SimulationSummaryPanel.tsx`.

## 2. Mô hình trạng thái (FSM)

**Simulation** (`useSimulationSession`): `setup → starting → active → submitting_turn → completed → summary` (+ `coach`, `error`).

- `submitTurn(text, endEarly)` giữ nháp khi thất bại (`turnError` → phase active + error, nháp còn nguyên); thành công thì xóa nháp.
- Lỗi tạo/mở phiên (`createError`) quay về `setup` kèm thông báo — không xóa trạng thái UI.
- Tổng kết: `loadSummary` sau `sessionEnded`; `summary` có thể null → `SimulationSummary` chịu được.
- Người ảo (persona) & đề xuất thử thách từ `session.persona` / `summary.suggested_challenge` (cast cục bộ, fallback an toàn).
- Lịch sử mô phỏng được refresh khi có phiên active mới.

**Challenge** (`useChallengeSession`): `ready → submitting → result → retry → completed`.

- Điểm mạnh: `completed` = kết quả cao nhất; retry sau khi fail không reset kết quả đạt được.

## 3. Tính năng nổi bật

- **ScenarioPage**: bộ lọc Ngữ điệu / JLPT / Độ khó 1–10, `Tạo tình huống`, `Tình huống mới` (regenerate), lịch sử gần đây (`Xem`), deep-link `?scenario=`; CTA `Bắt đầu viết` → tạo exercise → `?exercise=&scenario=`, `Bắt đầu mô phỏng` → `?scenario=`.
- **Landing tình huống**: phân cấp thông tin đúng spec — meta → bối cảnh → mục tiêu → yêu cầu bắt buộc → điểm mở rộng → lưu ý tránh; note `Tình huống = viết một lần · Mô phỏng = trò chuyện nhiều lượt`.
- **Studio tình huống**: `GenreFields` (email: Tiêu đề + thân bài, nối `件名：…`; bug report: 5 trường theo marker `【…】`); kết quả review thêm `Phù hợp tình huống` (Score + summary + 5 SkillBar: Hiểu đúng tình huống/Đúng đối tượng/Đạt mục đích/Đúng sắc thái/Tuân thủ lưu ý), danh sách yêu cầu bắt buộc + định dạng bài viết + `Viết lại chuyên nghiệp` (Sao chép); banner `Tình huống hoàn thành` với điểm fit + XP (diff `today_xp` giữa lúc vào studio và sau nộp); `Thử lại` thay `Đề tài mới`.
- **Mô phỏng**: header sticky (persona, mục tiêu, lượt, tiến độ mục tiêu, áp lực) + goal cạnh + thread AI/người + feedback từng lượt (điểm, giải thích, `Giải thích lượt trả lời`, tiếp tục/viết lại) + composer (Ctrl+Enter gửi, `Kết thúc sớm` với ConfirmDialog) + AI Coach panel (4 preset, thread, `✦ Đang suy nghĩ…`) + tổng kết (`MÔ PHỎNG HOÀN THÀNH`, strengths, cần cải thiện, resolution, so với buổi trước, `Thử ngay` đề xuất challenge) + `Mô phỏng mới`. Mobile: composer sticky + feedback sheet; mode `Đắm chìm`/`Có hướng dẫn`.
- **Thử thách**: landing (mục tiêu, hướng dẫn, câu gốc) → `Bắt đầu` → editor + XP thưởng → kết quả: thành công (`THỬ THÁCH HOÀN THÀNH`, `+N XP`, glow) / chưa đạt (`CHƯA ĐẠT NHÉ`, `Thử lại`); deep-link `?challenge=`; PracticePage dùng `ChallengeWorkspace` mới.
- **Nguyên tắc lỗi**: câu chữ đúng spec — `Không thể tạo tình huống lúc này.`, `Không thể tiếp tục mô phỏng. Nội dung trước đó vẫn được giữ lại.`, `Không thể tạo thử thách lúc này.`, `AI Coach tạm thời không khả dụng.`; luôn kèm chi tiết kỹ thuật + nút `Thử lại`; không bao giờ mất nội dung người dùng.
- **Backend là nguồn sự thật**: frontend không tự tính fit/effectiveness/goal progress/XP/streak — chỉ hiển thị; **không thêm endpoint mới** (dùng trọn bộ API có sẵn).

## 4. Nguyên tắc tuân thủ

1. Không sửa component dùng chung; 0 màu hex trong component (toàn bộ qua token: `--text-micro/body-sm/body/subtitle/h1`, `--radius-lg`, `--space-2xl`, `--topbar-height`, `--z-sticky`, `--font-jp`).
2. Không giai đoạn AI giả — mọi thao tác qua endpoint có sẵn của `api.ts`.
3. `prefers-reduced-motion` tôn trọng (đối thoại mới hiện lên, glow thử thách).
4. Trường chưa có type phía backend → cast cục bộ an toàn (persona, suggested_challenge, evaluation attempt).
5. Autosave nháp mô phỏng 400ms, chỉ xóa sau khi nộp thành công.

## 5. Kiểm chứng

- `npm test` — **230/230 pass** (34 files; thêm 8 test mới + 9 test viết lại).
- Typecheck — `npx tsc --noEmit -p tsconfig.app.json` pass (strict). ⚠️ Lưu ý: `tsc --noEmit` ở root **không** check code thật (project references `files: []` — chỉ kiểm tra khi dùng `-p tsconfig.app.json` / `tsconfig.node.json`); đã phát hiện và sửa 9 lỗi import sai độ sâu ở `simulation/*` theo đúng cách này.
- `npm run lint` — pass, chỉ còn cảnh báo fast-refresh đã chấp nhận sẵn từ trước.
- `npm run build` — pass; chunk SimulationPage 27 kB (gzip 8 kB), FreeWritingPage 47 kB (gzip 12 kB).

## 6. Hạn chế đã biết (đã chấp nhận)

- **Nhãn trạng thái yêu cầu bắt buộc ở studio dùng `FORMAT_LABELS`** (`Đầy đủ`/`Thiếu một phần`/`Còn thiếu`) thay vì nhãn `Đã đáp ứng`/`Đáp ứng một phần` — cố tình tái dùng bảng nhãn định dạng cho nhất quán trực quan; landing dùng nhãn riêng (`Đã đáp ứng`/`Còn thiếu`).
- **XP tình huống = diff `today_xp`** trong phiên studio (không có endpoint XP riêng) — có thể bao gồm XP từ hoạt động khác cùng ngày; nền tảng nên bổ sung trường XP cho submission nếu muốn chính xác tuyệt đối.
- **Tiến độ mục tiêu** suy từ `completed_items/(completed_items+unresolved_items)` phía client theo quyết định đã duyệt; fallback `evaluation.goal_progress` từng lượt.
- **`index.css` legacy** (~dòng 172–1130) vẫn là dead code — giữ vì một phần class dùng chung với PracticePage.
- Recent scenarios (`Xem` ngay từ lịch sử) chưa có màn xem chi tiết riêng — đi thẳng vào landing/studio.

## 7. Khuyến nghị tiếp theo

**UI Phase 6 — Vocabulary, Memory, Journey & Progress** (chưa triển khai): màn hình Vocabulary/Memory/Journey hiện tại là shell cơ bản; đề xuất nâng theo chuẩn tương tác Phase 4–5 (FSM hook + pane + overlay AI), gồm bảng thẻ từ vựng, hành trình mục tiêu (journey) và tổng quan tiến độ — tận dụng trực tiếp các component dùng chung (SkillBar, Score, CompletionSummary, Banner).