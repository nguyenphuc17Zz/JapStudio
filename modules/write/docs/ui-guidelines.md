# Quy chuẩn Thiết kế & Đồng bộ Giao diện (UI Guidelines & Synchronization Standards)

Tài liệu này là **bộ quy chuẩn bắt buộc** đối với tất cả các thay đổi hoặc tính năng mới liên quan đến giao diện người dùng (UI/UX) trên toàn bộ hệ thống Japanese Writing Studio. Mọi AI Agent hoặc lập trình viên khi làm việc với codebase này **bắt buộc phải tuân thủ nghiêm ngặt**.

---

## 🌸 1. Triết lý Thiết kế: Wabi-Sabi Modern & Japanese Craftsmanship

1. **Tinh giản & Tự nhiên (Simplicity & Organic Elegance)**:
   - Ưu tiên không gian thở (`whitespace`), bố cục cân đối và rõ ràng.
   - Tránh giao diện rườm rà, nhồi nhét hiệu ứng hào nhoáng không cần thiết.
   - Sử dụng ngôn ngữ thiết kế nhất quán với tiền tố class `.jw-` (Japanese Writing).

2. **Hài hòa Màu sắc & Ánh sáng**:
   - Sử dụng gam màu nền tối ấm (`#181615`, `#201e1d`, `#282523`) kết hợp viền mờ (`border: 1px solid var(--color-border)`).
   - Điểm nhấn ánh sáng tinh tế với Glassmorphism (`rgba(255, 255, 255, 0.04)`), hiệu ứng đổ bóng mờ (`box-shadow: 0 1px 3px rgba(0,0,0,0.2)`).
   - Màu nhận diện thương hiệu AI: Thừa hưởng các biến `--color-ai`, `--color-ai-muted`, `--color-ai-glow` với biểu tượng ngôi sao/lấp lánh (`✨`, `⚡`, `🦙`).

---

## 🧩 2. Bắt buộc Tái sử dụng UI Primitives (Tuyệt đối không tự viết raw elements)

Mọi component UI mới **bắt buộc tái sử dụng** các component nền tảng có sẵn trong `apps/web/src/components/ui/` và `src/components/ai/`:

| UI Component | Vị trí File | Quy định sử dụng |
| :--- | :--- | :--- |
| **Dropdown / Select** | `src/components/ui/Select.tsx` | **TUYỆT ĐỐI KHÔNG dùng thẻ `<select>` HTML thô.** Luôn dùng `<Select id="..." label="...">` để thừa hưởng Floating Portal menu, hiệu ứng âm thanh click Wabi-Sabi và accessibility. |
| **Button** | `src/components/ui/Button.tsx` | Dùng `<Button variant="primary|secondary|outline|ghost|danger" icon="..." size="sm|md|lg">`. |
| **Cards & Panels** | `src/components/ui/Card.tsx` | Dùng `<Card>`, `<CardHeader title="..." actions="...">`, `<CardContent>`, `<CardFooter>`. Với tính năng AI dùng `<Card variant="ai">`. |
| **Input / Textarea** | `src/components/ui/Input.tsx`, `Textarea.tsx` | Dùng `<Input label="..." id="..." />`, `<Textarea label="..." id="..." />`. |
| **AI Model Selector** | `src/components/ai/AIModelPicker.tsx` | Dùng `<AIModelPicker variant="compact|inline|card">` cho mọi tính năng có AI. |
| **Alerts & Messages** | `src/components/ui/Alert.tsx` | Dùng `<Alert tone="info|success|warning|error" title="...">`. |
| **Spinner & Empty** | `src/components/ui/Spinner.tsx`, `EmptyState.tsx` | Dùng `<Spinner size="sm|md|lg">` và `<EmptyState>`. |

---

## 🎨 3. Hệ thống Tokens Bắt buộc (`tokens.css`, `ui.css`, `ai.css`)

> [!IMPORTANT]
> **Tuyệt đối KHÔNG hardcode mã màu HEX tùy tiện hoặc inline style bừa bãi.**
> Mọi component UI bắt buộc phải sử dụng các biến CSS Token chuẩn sau:

### A. Bảng màu (Color Tokens)
- `var(--color-surface)`: Nền chính của container, card, modal
- `var(--color-surface-subtle)`: Nền phụ, input nền mờ, hàng danh sách
- `var(--color-surface-elevated)`: Nền nổi bật (Dropdown, Popover, Tooltip, TopBar pill)
- `var(--color-foreground)`: Màu chữ chính (#f5f4f0)
- `var(--color-foreground-secondary)`: Màu chữ phụ, label phụ (#a8a29e)
- `var(--color-foreground-muted)`: Màu chữ mờ, placeholder (#78716c)
- `var(--color-border)`: Viền mặc định (#332f2c)
- `var(--color-border-hover)`: Viền khi hover (#4a4440)
- `var(--glass-border)`: Viền kính mờ cho topbar và popovers
- `var(--color-primary)`: Màu thương hiệu chính
- `var(--color-ai)`: Màu điểm nhấn cho các tính năng AI
- `var(--color-ai-glow)`: Hiệu ứng phát sáng khi focus thành phần AI

### B. Kiểu chữ & Khoảng cách (Typography & Spacing)
- `var(--font-sans)`: Font chữ chuẩn toàn hệ thống (`Inter`, system-ui)
- `var(--text-micro)`: 11px (Badge, Tag, Ký hiệu nhỏ)
- `var(--text-caption)`: 12px (Label phụ, helper text, thời gian)
- `var(--text-body-sm)`: 14px (Nội dung dropdown, input text, nút nhỏ)
- `var(--text-body)`: 16px (Nội dung bài viết, câu văn luyện tập)
- `var(--text-title)`: 18px / 20px (Tiêu đề card, header)
- `var(--space-xs)` đến `var(--space-2xl)`: Khoảng cách từ 4px đến 48px
- `var(--radius-sm)` đến `var(--radius-full)`: Bo góc 4px, 8px, 12px, 9999px (pill)

---

## 🎯 4. Quy chuẩn Bố cục & Vị trí Điều khiển (Layout Standards)

1. **TopBar Action Items**:
   - Chiều cao cố định `32px`, bo góc `8px` (`var(--radius-md)`), nền `rgba(255, 255, 255, 0.04)`, viền `1px solid var(--glass-border)`.
   - Khi click mở Floating Popover mờ (`var(--glass-bg)`, `backdropFilter: var(--glass-blur)`).
2. **Form Fields & Grids**:
   - Sắp xếp các trường dữ liệu theo lưới chuẩn `.jw-inline.jw-gap-md` hoặc `.jw-grid.jw-grid--2`.
   - Đặt các nút hành động (Tạo bài, Nộp bài, Nhận thử thách) ở hàng dưới cùng, canh phải:
     `<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>`
3. **AI Provider & Model Integration**:
   - **Tuyệt đối KHÔNG hardcode danh sách model tĩnh.** Toàn bộ danh sách model phải được lấy 100% động từ API chính thức của nhà cung cấp (`/api/v1/ai/models?provider=<name>` hoặc `fetchModelsForProvider(provider)`).
   - **Tuyệt đối KHÔNG hiển thị Fake AI Provider trên UI.** Chỉ hỗ trợ **Google Gemini**, **Groq Cloud**, **Ollama**.

---

## 📋 5. Checklist Bắt buộc Trước khi Hoàn thành Task

Mỗi khi chỉnh sửa hoặc thêm UI, AI Agent bắt buộc phải:
- [ ] Chạy `npm run build` trong `apps/web` (`tsc -b && vite build`) và đảm bảo **0 lỗi TypeScript, 0 cảnh báo**.
- [ ] Chạy unit test liên quan với `npx vitest run <file>`.
- [ ] Kiểm tra khả năng truy cập (A11y): có `aria-label`, `<label htmlFor="...">`.
- [ ] Đảm bảo tương thích responsive trên Mobile & Desktop.
