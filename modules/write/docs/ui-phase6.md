# UI Phase 6 — Vocabulary, Memory, Journey, Analytics & Cultural Gamification

Trạng thái: **hoàn thành** · Phạm vi: `apps/web` & `apps/api`

Phase 6 hoàn thiện hệ thống giao diện cho toàn bộ các trang chuyên sâu còn lại (Ngân hàng Từ vựng, Trí nhớ AI, Lộ trình học tập cá nhân hóa, Phân tích dữ liệu học tập, Kiểm thử chất lượng AI, Cài đặt mô hình AI & Khóa API) cùng trải nghiệm thẩm mỹ truyền thống Nhật Bản (Zen Atmosphere, Hanko Stamp, Vocab TCG Pack, Omikuji, Ema Tags, Shodo Certificate, Bonsai Garden, Kintsugi Healing, Âm thanh thư thái).

---

## 1. Cấu trúc thư mục mới & cập nhật

```
src/
├── components/
│   ├── gamification/
│   │   ├── HankoStamp.tsx             — Con dấu Hanko đỏ truyền thống (In ấn, Triện thư)
│   │   ├── VocabPackModal.tsx         — Mở gói thẻ từ vựng phong cách TCG (Holographic foil effect)
│   │   ├── EmaTagPicker.tsx           — Thẻ gỗ Ema cầu nguyện tại đền thờ Nhật Bản để lọc danh mục
│   │   ├── ZenAtmosphere.tsx          — Bầu không khí Zen động: Bình minh, Trưa hè, Hoàng hôn, Đêm trăng
│   │   ├── ZenSoundscapePlayer.tsx    — Bộ phát âm thanh thiên nhiên (Mưa rào, Suối róc rách, Chuông gió)
│   │   ├── ParticleBackground.tsx     — Hiệu ứng hoa anh đào (Sakura), lá phong (Momiji), tuyết rơi (Yuki)
│   │   ├── OmikujiModal.tsx           — Quẻ bói Omikuji đầu ngày (Đại cát, Trung cát, Tiểu cát)
│   │   ├── KintsugiHealing.tsx        — Nghệ thuật hàn gắn Kintsugi bằng chỉ vàng khi sửa lỗi sai
│   │   ├── ShodoCertificateModal.tsx  — Bằng chứng nhận Thư đạo (Shodo) phong cách cuộn giấy truyền thống
│   │   ├── BonsaiGarden.tsx           — Cây Bonsai phát triển theo chuỗi streak học tập
│   │   └── FlowComboMeter.tsx         — Đồng hồ đo trạng thái Flow khi tập trung viết liên tục
│   ├── layout/
│   │   ├── SeasonSwitcher.tsx         — Chuyển đổi 4 mùa Nhật Bản: Haru 🌸, Natsu 🎐, Aki 🍁, Fuyu ❄️
│   │   └── Sidebar.tsx / TopBar.tsx   — Tích hợp bộ điều khiển mùa, âm thanh và trạng thái kết nối
│   └── ui/
│       ├── Select.tsx                 — Bộ chọn Select & Combobox tùy biến cao cấp, hỗ trợ tìm kiếm
│       └── TiltCard.tsx               — Thẻ tương tác 3D tilt theo vị trí chuột
├── pages/
│   ├── VocabularyPage.tsx             — Ngân hàng từ vựng: Thẻ TCG, lọc Ema gỗ, phân loại độ thuần thục
│   ├── VocabularyDetailPage.tsx       — Chi tiết từ vựng: Bối cảnh khám phá, phân tích ngữ cảnh, nguồn gốc
│   ├── MemoryPage.tsx                 — Quản lý trí nhớ AI: Tìm kiếm, lọc loại trí nhớ, làm mới, lưu trữ
│   ├── JourneyPage.tsx                — Lộ trình mục tiêu: Cột mốc (Milestones), mục tiêu phụ, trạng thái thuần thục
│   ├── AnalyticsPage.tsx              — Trung tâm phân tích học tập: Radar kỹ năng, hiệu quả, khuyến nghị AI
│   ├── AiQualityPage.tsx              — Bảng điều khiển kiểm thử chất lượng AI, Golden benchmark, Prompt registry
│   └── SettingsPage.tsx               — Cài đặt nâng cao: Lựa chọn mô hình AI theo provider, quản lý khóa API, hồ sơ cá nhân
└── context/
    └── SeasonContext.tsx              — Quản lý trạng thái mùa & hiệu ứng hạt toàn ứng dụng
```

---

## 2. Các tính năng cốt lõi hoàn thành

### A. Ngân hàng từ vựng & Chi tiết từ vựng (Vocabulary & VocabularyDetail)
- **Giao diện thẻ 3D Tilt**: Thẻ từ vựng hiển thị Kanji, Furigana, ý nghĩa tiếng Việt, cấp độ JLPT, độ thuần thục (`Mới`, `Đang học`, `Quen thuộc`, `Đã nắm chắc`).
- **Thanh lọc thẻ gỗ Ema (`EmaTagPicker`)**: Lọc trực quan theo thẻ gỗ phong cách đền thờ Nhật Bản (Từ vựng `語`, Cụm từ `句`, Kết hợp từ `連`).
- **Mở gói thẻ TCG (`VocabPackModal`)**: Trải nghiệm bóc gói thẻ từ vựng với hiệu ứng lấp lánh Holographic.

### B. Trí nhớ học tập AI (Personal AI Memory)
- **Quản lý trí nhớ tương tác**: Xem, tạo thủ công, lưu trữ (Archive) hoặc yêu cầu AI quên (Forget).
- **Hệ thống phân loại đa dạng**: `preference`, `weakness`, `strength`, `habit`, `goal`, `context`.
- **Đồng bộ hóa tự động**: Làm mới bộ nhớ dựa trên lịch sử làm bài và tương tác gần nhất.

### C. Lộ trình học tập (Curriculum & Learning Journey)
- **Cột mốc & Mục tiêu chi tiết**: Hiển thị chuỗi Milestones và Objectives từ mục tiêu lớn đến từng kỹ năng cụ thể.
- **Theo dõi tiến độ thuần thục**: Đánh dấu trạng thái mục tiêu đang học, hoàn thành, hoặc cần tái lập kế hoạch khi chững lại.
- **Hỗ trợ tạo mới & Tái lập lộ trình**: Tương tác với AI Curriculum Engine trực tiếp từ giao diện.

### D. Bảng điều khiển Phân tích & Trí tuệ sản phẩm (Analytics & AI Quality)
- **Radar & Lưới kỹ năng**: Biểu đồ phân tích đa chiều (Ngữ pháp, Từ vựng, Độ tự nhiên, Sắc thái, v.v.).
- **Golden Benchmark Runner**: Chạy bộ kiểm thử 107 ca vàng trực tiếp trên giao diện để đo lường độ chính xác của AI.
- **Quản lý Prompt Registry**: Xem và kiểm tra các phiên bản prompt của hệ thống.

### E. Cài đặt AI & Lựa chọn Mô hình (AI Provider & Model Settings)
- **Hỗ trợ lựa chọn Model theo Provider**: Cho phép người dùng chọn model mặc định cho Gemini, Groq, Ollama trực tiếp từ UI.
- **Bảo mật khóa API**: Khóa được mã hóa, chỉ hiển thị dạng masked (`AIza****7890`) và hỗ trợ lưu vào cơ sở dữ liệu.

---

## 3. Thẩm mỹ văn hóa Nhật Bản & Trải nghiệm tương tác

1. **Bầu không khí Zen & 4 mùa**: Hệ thống chuyển đổi linh hoạt 4 mùa Nhật Bản kèm hạt rơi (Sakura, Momiji, Yuki).
2. **Con dấu Hanko**: Đóng dấu triện đỏ xác nhận hoàn thành bài tập hoặc nhiệm vụ hàng ngày.
3. **Kintsugi Healing**: Tái hiện triết lý cái đẹp trong sự bất toàn khi học từ các lỗi sai trong bài viết.
4. **Trình phát âm thanh Zen**: Âm thanh chuông gió (Furin), tiếng suối và mưa giúp tăng cường sự tập trung khi viết.

---

## 4. Kết quả kiểm thử & Xác thực

- **Backend Pytest**: **762 passed, 8 skipped** (100% tests passed).
- **Frontend Vitest**: **233 passed (34 test files)**.
- **TypeScript Typecheck**: Sạch lỗi trên toàn bộ workspace (`tsc -b`).
- **Production Build**: Biên dịch thành công gói tối ưu hóa dung lượng với mã nguồn phân tách theo trang (`vite build`).
