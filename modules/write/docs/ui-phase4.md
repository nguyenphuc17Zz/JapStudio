# UI Phase 4 — Writing Studio & Long-form Experience

Trạng thái: **hoàn thành** · Phạm vi: `apps/web`

Phase 4 biến Free Writing thành **Writing Studio** — trải nghiệm viết dài (long-form) trọn vẹn: nháp → nộp bài → đánh giá từng câu & mạch văn → chế độ học tập (gợi ý từng bước) → bản sửa & so sánh → AI Coach trò chuyện → chế độ tập trung.

## 1. Cấu trúc thư mục

```
src/hooks/useWritingSession.ts        — FSM trạng thái toàn bộ phiên viết
src/components/writing/studio/
  TopicPane.tsx                        — đề tài, chip, tình huống (scenario), gợi ý cấu trúc, editor, nộp bài
  YourWritingPane.tsx                  — bài viết của bạn: từng câu, marker, điểm, jump-to-sentence
  LearningModePane.tsx                 — gợi ý từng bước (● ● ○ ○), reveal, bản viết lại tham khảo
  ReviewPane.tsx                       — AI Review: điểm, chất lượng câu/mạch văn, điểm mạnh, vấn đề
  RevisionsPane.tsx                    — timeline bản sửa, so sánh delta + diff câu, nhận xét AI
  CoachPane.tsx                        — AI Coach: preset, hội thoại, đề xuất, hỏi tự do
  WritingStudio.tsx                    — orchestrator: toolbar, hành động, overlay, focus mode
src/styles/writing-studio.css          — toàn bộ class jw-studio-*
src/styles/shell.css                   — + focus mode (body.jw-focus-mode)
src/pages/FreeWritingPage.tsx          — shell mỏng: tạo đề tài + deep-link (?exercise=&scenario=)
src/test/FreeWritingPage.test.tsx      — 5 test (tạo đề tài, prefs, loading, lỗi, deep-link)
src/test/FreeWritingWorkspace.test.tsx — 6 test (nộp bài, hints/reveal, sửa/so sánh, coach, nháp, lỗi)
```

Đã xóa (kế thừa cũ, chỉ dùng bởi FreeWritingPage cũ):
`components/WritingResults.tsx`, `components/RevisionCompare.tsx`, `test/WritingResults.test.tsx`, `test/RevisionCompare.test.tsx`.

## 2. Mô hình trạng thái (FSM)

`useWritingSession` — một reducer duy nhất, không boolean rải rác:

`draft → submitting → evaluating → review → hinting → revealed → revising → compare → coach → error`

- Tab điều hướng: `write | review | revisions | coach` (toolbar: Viết / Đánh giá / Bản sửa / AI Coach; nhãn "Bản sửa" đổi thành "So sánh" khi đang so sánh).
- Hành động: **Viết lại** (nháp = bài hiện tại, badge "Đang viết lại bản N"), **Đề tài mới**, **Tập trung** (desktop/tablet).
- Overlay `✦ AI đang đánh giá bài viết của bạn…` khi submitting/evaluating/revising.
- Lỗi dùng đúng câu chữ spec: `Không thể đánh giá bài viết.` / `Bản sửa chưa được tạo. Bản trước vẫn được giữ nguyên.` / `AI Coach hiện tạm thời unavailable.` + nút Thử lại (retryAction: submit/revise).
- **Nháp**: autosave 400ms vào `localStorage['draft:free-writing:{exercise.id}']`, khôi phục khi mở lại, xóa sau khi nộp/sửa thành công; nhãn "Đã lưu cục bộ"/"Chưa lưu" — không bao giờ khẳng định lưu server.

## 3. Tính năng nổi bật

- **Đánh giá 2 tầng**: điểm tổng + chất lượng câu/mạch văn; 6 dimension mạch văn (SkillBar) khi `discourse_available`; Alert "phân tích mạch văn hiện chưa khả dụng" khi không có.
- **Từng câu**: nút câu (`jw-studio-sentence-{index}`), marker vấn đề, điểm câu, cuộn mượt (giảm chuyển động khi `prefers-reduced-motion`), split pane trái/bài — phải/phân tích.
- **Vấn đề**: nhóm "Theo từng câu" (grammar/vocabulary/naturalness/semantic) và "Mạch văn", mức độ info/minor/major/critical, điều hướng "Trước/Vấn đề x/y/Tiếp theo" trên mobile.
- **Học tập**: gợi ý từng bước với chấm trạng thái, reveal gated sau khi hết gợi ý, 3–4 bản viết lại tham khảo (grid desktop / pills mobile) + Sao chép (clipboard, fallback execCommand, toast).
- **Bản sửa**: timeline `Bản N · điểm` (desktop) / pills (mobile); so sánh delta từng chiều (＋/−) + diff câu (thêm/bỏ/đổi) + nhận xét AI; "Về bản mới nhất".
- **AI Coach**: banner ngữ cảnh (bản N · điểm), 5 preset, thread hỏi/đáp + đề xuất, compose tự do, `✦ Đang suy nghĩ…`, lỗi Alert; mobile = sheet toàn chiều cao, Esc → quay lại Đánh giá.
- **Tập trung**: `body.jw-focus-mode` ẩn sidebar + topbar (shell.css), Esc thoát, không hiện trên mobile.
- **Deep-link**: `/free-writing?exercise={id}&scenario={id}` tải thẳng đề tài + tình huống.

## 4. Nguyên tắc tuân thủ

1. Không sửa component dùng chung (Tabs/Button/Alert/…) — toolbar tabs dùng `content: null`; không portal mới.
2. Không có màu hex trong component; toàn bộ qua token.
3. Không có giai đoạn AI giả — mọi thao tác đi qua 8 endpoint writing có sẵn của `api.ts`.
4. `prefers-reduced-motion` tôn trọng (cuộn, transition).
5. Điểm/độ dài không đơn vị giả; `CharacterCounter` đếm theo code point.

## 5. Kiểm chứng

- `npm test` — **221/221 pass** (32 files; 11 test Free Writing mới).
- `npm run typecheck` — pass (strict).
- `npm run lint` — pass, 9 cảnh báo fast-refresh cùng loại đã chấp nhận (Badge, Toast, ConnectionStatus, ThemeProvider + 4 export const mới ở studio).
- `npm run build` — pass; chunk FreeWritingPage 38 kB (gzip 10 kB).

## 6. Hạn chế đã biết (đã chấp nhận)

- **Recent writings (mục §39) chưa làm** — không có endpoint list submissions; đề xuất nền tảng bổ sung.
- **Gợi ý không phân loại câu/mạch văn** — spec §27 muốn phân biệt, nhưng `WritingHintResponse` không có trường phân loại → hiển thị thống nhất.
- **CSS cũ của Free Writing trong `index.css`** (~dòng 172–1130) thành dead code — giữ nguyên vì một phần class dùng chung với PracticePage.
- **Coach hiểu ngữ cảnh nhờ evaluation phía client**; nâng cấp vocab-aware nên làm phía backend.

## 7. Khuyến nghị tiếp theo

**UI Phase 5 — Real-world Scenarios, Simulation & Challenge Experience** (theo kiến trúc đề xuất ban đầu): phát triển `SimulationPage`/`ChallengePage` theo chuẩn tương tác này (FSM hook + pane studio + overlay AI), tận dụng trực tiếp các màn hình đã có ở Phase 1–3.