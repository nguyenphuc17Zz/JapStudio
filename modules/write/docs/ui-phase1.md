# UI Phase 1 — Design System

Trạng thái: **hoàn thành** · Phạm vi: `apps/web`

Phase 1 xây dựng nền móng thiết kế thống nhất cho toàn bộ sản phẩm mà **không đụng vào các trang hiện có** (chúng tiếp tục dùng CSS cũ với biệt danh token để hoạt động trong cả hai chủ đề).

## 1. Cấu trúc thư mục

```
src/styles/
  tokens.css        — toàn bộ token (dark mặc định + [data-theme='light']), biệt danh legacy
  base.css          — reset, focus-visible, reduced-motion
  ui.css            — Button → ErrorState
  ai.css            — AIInsight, AIRecommendation, AIHint, AIStatus, AISuggestion,
                      AICoachMessage, AIExplanation, AIReason, AIThinking
  writing.css       — WritingEditorShell, WritingToolbar, CharacterCounter, EditorFooter
  layout.css        — Page, PageHeader, Section, Stack, Inline, Grid, SplitPane,
                      ContentContainer, Sidebar, MobileNav, ThemeSwitcher
src/theme/          — ThemeProvider + useTheme (key: localStorage['jws.theme'])
src/components/
  icons/Icon.tsx    — IconName (~55 biểu tượng inline SVG, strokeWidth 1.5)
  ui/               — Button, IconButton, Spinner, FormField, Input, Textarea, Select,
                      Combobox, Checkbox, Switch, Radio, Tabs, Badge, Chip, Card, Divider,
                      Tooltip, Popover, Dropdown, Dialog, ConfirmDialog, Drawer, Toast, Alert,
                      Progress, Score, Skeleton, EmptyState, ErrorState
  ai/               — 9 thành phần AI
  writing/          — nền tảng editor viết
  layout/           — khối bố cục + điều hướng
src/pages/DesignSystemPage.tsx — showcase tại /design-system (chỉ DEV)
src/test/ui/        — test của hệ thống thiết kế
```

## 2. Nguyên tắc bất biến

1. **Không có hex màu trong component** — component chỉ dùng `var(--token)`. Giá trị sống ở `tokens.css`.
2. **Tiền tố class `jw-`** — tránh đụng CSS cũ của `index.css`.
3. **Dark là mặc định** — light override qua `[data-theme='light']`; `color-scheme` đặt theo theme.
4. **FOUC-safe** — `public/theme-init.js` (file ngoài, vì CSP chặn inline script) chạy trước paint.
5. **/design-system chỉ trong DEV** — `import.meta.env.DEV ? lazy(...) : null`; build prod không chứa chunk này (đã kiểm chứng).
6. **Không hiển thị lỗi backend thô** — `ErrorState` luôn dùng thông điệp thân thiện + mã lỗi tùy chọn.
7. **Mọi `role="status"`** dùng cho trạng thái chờ; alert dùng `role="alert"`.

## 3. Token nổi bật

- **Accent**: indigo Nhật — `#6f81f1` (dark) / `#4a56b8` (light).
- **Lớp AI**: `--color-ai/-ai-muted/-ai-border/-ai-glow` + biểu tượng sparkle (không dùng robot/bong bóng chat).
- **Họ phản hồi học tập** (provisional): `grammar→error`, `vocabulary→purple`, `naturalness→amber`, `semantic→green`, `register→blue`, `discourse→indigo`, `scenario→muted accent`.
- **Typography**: thang UI (`--text-hero…--text-micro`) + thang Nhật (`--jp-hero…--jp-caption`, `--font-jp`).
- **Legacy alias**: `--bg, --surface, --border, --text, --text-muted, --primary, --primary-soft, --danger, --ok, --sidebar-*` — các trang cũ chạy không đổi ở cả 2 chủ đề.

## 4. Quy ước trạng thái

- `prefers-reduced-motion: reduce` — tắt shimmer, spinner quay thành nhấp nháy mờ, chuyển động thu gọn.
- Dialog/Drawer: portal `document.body`, focus trap, Esc, khóa cuộn, hoàn trả focus.
- Dropdown/Combobox/Tabs: đủ điều hướng bàn phím (mũi tên, Home/End, Esc, Tab).
- Toast tối đa 5 item, tự động ẩn theo loại (success 3.5s … error 7s).

## 5. Kiểm chứng

- `npm run lint` — pass (4 cảnh báo fast-refresh đã chấp nhận: Badge, Toast, ThemeProvider, theme-init.js).
- `npm run typecheck` — pass.
- `npm run test` — **187 test / 32 file** pass.
- `npm run build` — pass; không có chunk DesignSystemPage trong dist.

## 6. Đề xuất tiếp theo

**UI Phase 2 — App Shell & Navigation**: ráp `Sidebar`/`MobileBottomNav`/`ThemeSwitcher` vào `AppLayout`, di dời từng trang sang layout mới, chuyển `index.css` legacy thành bảng tên `jw-*`. Không thực hiện trong phase 1.