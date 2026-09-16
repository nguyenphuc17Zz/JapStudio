# JapStudio — Master AI Router & Architecture Guide

> **MANDATORY FOR ALL AI AGENTS (Antigravity, Cursor, Claude Code, Copilot):**
> This is a Multi-Mode Monorepo. **DO NOT read all files in this workspace.** To save tokens and avoid cross-module hallucination, strictly follow the routing rules below.

---

## 🧭 1. AI Context Routing Matrix (QUY TẮC NẠP NGỮ CẢNH)

| Nếu người dùng yêu cầu làm việc với: | 👉 AI CHỈ ĐƯỢC PHÉP ĐỌC: | ⛔ CẤM TUYỆT ĐỐI ĐỌC: |
| :--- | :--- | :--- |
| **🎙️ Luyện Nói (Speaking, Voice, STT, TTS)** | `modules/speak/` & [modules/speak/AGENTS.md](file:///E:/JapStudio/modules/speak/AGENTS.md) | `modules/write/`, `modules/immersion/` |
| **✍️ Luyện Viết (Writing, Grammar, Drills, Boss)** | `modules/write/` & [modules/write/AGENTS.md](file:///E:/JapStudio/modules/write/AGENTS.md) | `modules/speak/`, `modules/immersion/` |
| **🌏 Đắm Chìm Ngôn Ngữ (Immersion, Sources, Connectors)** | `modules/immersion/` & [modules/immersion/AGENTS.md](file:///E:/JapStudio/modules/immersion/AGENTS.md) | `modules/speak/`, `modules/write/` |
| **🌐 Hub / Switcher / Khởi động / Mở rộng Mode** | `start.bat`, `stop.bat`, `switch.bat`, [docs/EXPANSION_GUIDE.md](file:///E:/JapStudio/docs/EXPANSION_GUIDE.md) | Các file logic backend sâu |

---

## ⚡ 2. Tech Stack Isolation & Critical Rules

### Module 1: JapSpeak (`modules/speak/`)
- **Frontend**: Next.js 14+ App Router, React 18, TailwindCSS, Framer Motion, Lucide icons (Port 3000).
- **Backend**: FastAPI, Faster-Whisper, Edge-TTS & Kokoro-82M TTS, SQLite `speaking_training.db` (Port 8000).
- 🚨 **RULE**: **KHÔNG ĐƯỢC CHẠY `npm run build`** khi dev đang chạy. Dùng `npm run typecheck` (`tsc --noEmit`).

### Module 2: JapWrite (`modules/write/`)
- **Frontend**: Vite, React 19, React Router DOM, Vanilla CSS Tokens (`tokens.css`, `ui.css`, `ai.css`) (Port 5173).
- **Backend**: FastAPI, Alembic, SQLite `japanese_writing.db`, Prompt Registry (Port 8001).
- 🚨 **RULE**: **TUYỆT ĐỐI KHÔNG dùng TailwindCSS** trong `write`. Tái sử dụng 100% UI primitives và CSS tokens từ `src/components/ui/`.

### Module 3: JapImmersion (`modules/immersion/`)
- **Frontend**: Next.js 14 App Router, React 18, TailwindCSS, Lucide icons (Port 3002).
- **Backend**: FastAPI, SQLAlchemy 2.0 (async), SQLite `immersion.db` (`aiosqlite`), SSRF protection, Fernet encryption (Port 8002).
- 🚨 **RULE**: Phase 1 tập trung **Source Manager & Connector Architecture**. Tuyệt đối không nhầm lẫn vai trò với Reading UI/Quiz của các phase sau.

---

## 🚀 3. Ports & Service Mapping
- **JapStudio Web Hub**: `http://localhost:3000` (trang chủ chọn mode)
- **JapSpeak Web**: `http://localhost:3000/dashboard` | **API**: `http://localhost:8000`
- **JapWrite Web**: `http://localhost:5173` | **API**: `http://localhost:8001`
- **JapImmersion Web**: `http://localhost:3002/sources` | **API**: `http://localhost:8002`

