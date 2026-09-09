# JapStudio — Hướng Dẫn Mở Rộng Hệ Thống (3–4 Modes)

Tài liệu này hướng dẫn cách thêm các chế độ học mới (ví dụ: **Mode 3: JapListen**, **Mode 4: JapRead**) vào hệ thống JapStudio mà **hoàn toàn không làm ảnh hưởng đến code cũ** và **giữ nguyên tối ưu token cho AI vibe-coding**.

---

## 🏗️ 1. Cấu Trúc Chuẩn Của Một Module Mới

Khi tạo một mode mới (ví dụ `modules/listen/`), cấu trúc luôn tuân theo chuẩn phân tầng:

```text
modules/listen/
├── apps/
│   ├── api/            # Backend FastAPI (ví dụ chạy Port 8002)
│   │   ├── app/
│   │   ├── requirements.txt
│   │   └── .venv/
│   └── web/            # Frontend Web (ví dụ chạy Port 5175 hoặc 3002)
│       ├── package.json
│       └── src/
├── start.bat           # Script khởi động riêng cho mode Listen
├── stop.bat            # Script dừng riêng cho mode Listen
└── AGENTS.md           # Quy tắc kỹ thuật riêng cho AI (để AI chỉ nạp file này)
```

---

## 📝 2. Quy Trình 3 Bước Tích Hợp

### Bước 1: Khởi tạo Module & Port riêng
- Chọn cặp Port riêng cho Module mới để tránh xung đột:
  - Mode 1 (Speak): API `8000`, Web `3000`
  - Mode 2 (Write): API `8001`, Web `5173`
  - Mode 3 (Listen - Dự kiến): API `8002`, Web `5174` (hoặc `3002`)
  - Mode 4 (Read - Dự kiến): API `8003`, Web `5175` (hoặc `3003`)
- Viết file `modules/<tên_mode>/AGENTS.md` mô tả các quy chuẩn kỹ thuật đặc thù của mode đó (UI framework, AI prompts, data model).

### Bước 2: Kích hoạt trên Web Hub Portal
- Mở file [page.tsx](file:///E:/JapStudio/modules/speak/apps/web/app/page.tsx):
  - Tìm đến Card của `JapListen` hoặc `JapRead`.
  - Đổi badge từ `Sắp ra mắt` sang `Sẵn sàng`.
  - Thay button disabled bằng thẻ link `<a href="http://localhost:5174" ...>Vào Luyện Nghe →</a>`.
- Cập nhật mục tương ứng trong [ModeSwitcher.tsx](file:///E:/JapStudio/modules/speak/apps/web/components/layout/ModeSwitcher.tsx).

### Bước 3: Cập nhật Master Launcher & Router
1. Trong file [start.bat](file:///E:/JapStudio/start.bat):
   - Thêm lựa chọn `[4] JapListen` vào menu hiển thị.
   - Thêm lệnh khởi động uvicorn port 8002 và npm run dev port 5174 trong nhãn `:START_ALL`.
2. Trong file [stop.bat](file:///E:/JapStudio/stop.bat):
   - Thêm lệnh dọn dẹp port `8002` và `5174`.
3. Trong file [AGENTS.md](file:///E:/JapStudio/AGENTS.md) ở thư mục gốc:
   - Thêm 1 dòng vào bảng điều hướng context:
     `| 🎧 Luyện Nghe (Listening) | modules/listen/ & modules/listen/AGENTS.md | modules/speak/, modules/write/ |`

---

## 🎯 3. Vì Sao Mô Hình Này Tối Ưu Cho AI Vibe-Coding?
- **Zero Token Waste**: Khi bạn muốn AI sửa tính năng nghe audio ở `JapListen`, AI chỉ nạp duy nhất ~60 dòng `modules/listen/AGENTS.md` và code của `modules/listen`. Toàn bộ 23 phases của `JapWrite` và hệ thống voice của `JapSpeak` sẽ không bao giờ bị AI nạp vào ngữ cảnh, tiết kiệm hàng trăm ngàn tokens mỗi ngày.
- **Zero Cross-Pollution**: Mỗi module có thể dùng công nghệ tối ưu nhất cho bài toán của nó (ví dụ: Listen có thể dùng Svelte, Solid hoặc React 19) mà không sợ bị xung đột phiên bản với Next.js của Speak.
