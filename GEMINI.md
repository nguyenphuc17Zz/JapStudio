# Repository Instructions & Guardrails (JapStudio)

## 1. CRITICAL: Dev Server Safety
- **KHÔNG ĐƯỢC CHẠY `npm run build` trong `modules/speak/apps/web`** khi dev server đang chạy. Sẽ làm hỏng bộ nhớ đệm Next.js và gây lỗi 500.
- **Quy chuẩn kiểm tra (Verification)**:
  - Cho Speak: Chạy `npm run typecheck` (`tsc --noEmit`) trong `modules/speak/apps/web`.
  - Cho Write: Chạy `npm run typecheck` (`tsc -b`) trong `modules/write/apps/web`.

## 2. Quản Lý Dịch Vụ
- `start.bat`: Khởi động hệ thống với menu chọn chế độ đồ họa trực quan (hoặc `start.bat all`, `start.bat speak`, `start.bat write`).
- `stop.bat`: Tắt toàn bộ cổng 8000, 8001, 3000, 5173.
- `restart.bat`: Khởi động lại toàn bộ dịch vụ.
