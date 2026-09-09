# JapStudio — Japanese Multi-Mode AI Learning OS (日本語総合学習スタジオ)

Hệ điều hành học tiếng Nhật đa chế độ với trí tuệ nhân tạo (Multi-Mode AI Learning OS), tích hợp các phân hệ chuyên sâu cho từng kỹ năng: **Luyện Nói (Speaking)**, **Luyện Viết (Writing)**, và sẵn sàng mở rộng cho **Luyện Nghe (Listening)** & **Luyện Đọc (Reading)**.

---

## 🌟 Tổng Quan Các Chế Độ (Active & Upcoming Modes)

| Chế Độ | Tên Module | Trạng Thái | Cổng Mạng | Công Nghệ Chính |
| :--- | :--- | :--- | :--- | :--- |
| **🌐 Hub Portal** | Master Web Hub | ✅ Hoạt động | `http://localhost:3000` | Next.js 14, TailwindCSS, Glassmorphism UI |
| **🎙️ Luyện Nói** | `modules/speak` | ✅ Hoạt động | Web `3000` • API `8000` | Faster-Whisper, VoiceVox, VAD, Next.js, FastAPI |
| **✍️ Luyện Viết** | `modules/write` | ✅ Hoạt động | Web `5173` • API `8001` | 23 Cấp độ, Alembic, Vite, React 19, CSS Tokens |
| **🎧 Luyện Nghe** | `modules/listen` | 🔒 Sắp ra mắt | Web `5174` • API `8002` | Biến âm, đa tốc độ 0.8x–1.5x, phương ngữ Nhật |
| **📖 Luyện Đọc** | `modules/read` | 🔒 Sắp ra mắt | Web `5175` • API `8003` | Báo chí NHK, bóc tách Kanji & Furigana |

---

## 🚀 Khởi Động Nhanh

### 1. Khởi động qua Launcher Menu:
Chỉ cần nhấp đúp vào `start.bat` tại thư mục gốc `E:\JapStudio`:
```text
======================================================================
             JAPSTUDIO — JAPANESE LEARNING MULTI-MODE OS
======================================================================
  [1] JapSpeak  - Luyện Nói & Hội Thoại AI  (Web :3000 | API :8000)
  [2] JapWrite  - Luyện Viết & Thử Thách AI (Web :5173 | API :8001)
  [3] Full Hub  - Chạy cả 2 Mode & Mở Hub Portal (Khuyên dùng)
  [4] Stop All  - Dừng toàn bộ cổng (8000, 8001, 3000, 5173)
  [5] Thoát
======================================================================
```

### 2. Khởi động nhanh qua dòng lệnh:
- Chạy cả 2 mode và mở Hub: `start.bat all` (hoặc `start.bat`)
- Chỉ chạy Luyện Nói: `start.bat speak`
- Chỉ chạy Luyện Viết: `start.bat write`
- Tắt tất cả dịch vụ: `stop.bat`
- Khởi động lại: `restart.bat`

---

## 🔄 Chuyển Đổi Chế Độ Trên Giao Diện (In-App Mode Switcher)
- **Web Hub Portal**: Khi truy cập `http://localhost:3000`, giao diện cung cấp các thẻ trực quan để chọn chế độ mong muốn.
- **Thanh điều hướng (TopBar Switcher)**: Dù đang ở màn hình nào của Luyện Nói hay Luyện Viết, bạn đều có nút chuyển chế độ nhanh ở thanh menu trên cùng để nhảy qua lại giữa các kỹ năng mà không cần khởi động lại.

---

## 🤖 Hướng Dẫn Vibe-Coding với AI (Tiết Kiệm Token Tối Đa)
- Đọc chi tiết tại [AGENTS.md](file:///E:/JapStudio/AGENTS.md).
- AI chỉ nạp ngữ cảnh của module đang làm việc (`modules/speak/` hoặc `modules/write/`), tuyệt đối không đọc chéo mã nguồn để tránh lãng phí token.
- Hướng dẫn thêm Mode 3 và Mode 4: Xem [docs/EXPANSION_GUIDE.md](file:///E:/JapStudio/docs/EXPANSION_GUIDE.md).
