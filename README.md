# 🏕️ Summer Night Campfire Poker (Pixel Art Edition)

Web game Poker Texas Hold'em phong cách Pixel Art độc đáo, lấy cảm hứng thiết kế từ khung cảnh đêm mưa dại trại bên đốm lửa trại (`assets/style.jpg`). Game tích hợp đầy đủ hệ thống cắt Sprite từ hình ảnh lá bài (`assets/cards.jpg`) và chip cược (`assets/chips.jpg`), cùng âm thanh 8-bit retro được tổng hợp trực tiếp bằng Web Audio API.

---

## 🎨 Cấu Trúc Dự Án (Project Structure)

```text
poker/
├── README.md                  # Hướng dẫn dự án & cài đặt
├── AGENT.md                   # Hướng dẫn chi tiết dành cho AI Agents / Developers
├── .venv/                     # Môi trường ảo Python (Virtual Environment)
├── assets/                    # Thư mục chứa nguyên liệu hình ảnh (Assets gốc)
│   ├── style.jpg              # Ảnh phong cách chủ đạo (Summer Night Campfire)
│   ├── cards.jpg              # Spritesheet 52 lá bài Pixel Art (13x4 grid)
│   └── chips.jpg              # Spritesheet Chip cược Poker Pixel Art
├── backend/                   # Python FastAPI Backend (Tích hợp AI & Poker Engine)
│   ├── main.py                # REST API Server, WebSocket & Static File Serving
│   ├── poker_engine.py        # Động cơ quản lý luật Poker Texas Hold'em & Tính bài
│   ├── ai_agent.py            # Động cơ quyết định AI Opponents (Alex, Bella, Charlie) & AI LLM Hook
│   ├── test_backend.py        # Unit test kiểm thử logic game & AI
│   └── requirements.txt       # Danh sách thư viện Python (FastAPI, Uvicorn, WebSockets, Pydantic)
└── frontend/                  # Pixel Art Game Frontend UI
    ├── index.html             # Giao diện chính với Canvas đốm lửa trại & Poker Table
    ├── styles.css             # Hệ thống thiết kế Pixel Art (Fonts, Retro Frames, Animations)
    └── js/
        ├── main.js            # Điều khiển luồng ứng dụng & tương tác UI
        ├── campfire_scene.js  # Động cơ Render Canvas hiệu ứng bầu trời sao, đom đóm & lửa trại
        ├── poker_game.js      # Động cơ Poker chạy trực tiếp trên Client (Offline AI Mode)
        ├── sprite_renderer.js # Bộ cắt & Render Sprite từ cards.jpg & chips.jpg
        ├── audio_synth.js     # Bộ tổng hợp âm thanh 8-bit Retro SFX (Web Audio API)
        └── backend_client.js  # Client kết nối WebSocket/REST tới Python Backend
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Game (Quick Start)

### 1. Kích hoạt môi trường ảo Python (`.venv`)

Môi trường ảo Python đã được khởi tạo sẵn tại thư mục `.venv`.

**Trên Windows (PowerShell / Command Prompt):**
```powershell
.\.venv\Scripts\activate
```

**Trên Linux / macOS:**
```bash
source .venv/bin/activate
```

---

## 🎮 Cách Chạy Game (2 Chế Độ Chơi)

### Chế độ 1: Standalone Offline AI (Chơi trực tiếp không cần Backend)
Mở trực tiếp file `frontend/index.html` trên trình duyệt web, hoặc mở bằng Python HTTP Server:
```bash
python -m http.server 8080 --directory frontend
```
Sau đó truy cập: `http://127.0.0.1:8080` trên trình duyệt.

### Chế độ 2: Kết nối Python FastAPI Backend (Khuyên dùng)
Chạy server Python FastAPI backend để sử dụng bộ xử lý logic server-side & AI Agent nâng cao:

```bash
# Chạy server FastAPI
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

- Trình duyệt sẽ tự động phục vụ frontend tại: `http://127.0.0.1:8000`
- REST API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- WebSocket Real-time Endpoint: `ws://127.0.0.1:8000/ws/poker`

---

## 🤖 Tính Năng Đối Thủ AI (AI Opponents)

Game tích hợp 3 đối thủ AI ngồi xung quanh đốm lửa trại với các cá tính cược khác nhau:
1. **Alex "The Rogue" (Táo bạo)**: Tỷ lệ tố (raise) và tố láo (bluff) cao, thường cược lớn với bài trung bình.
2. **Bella "The Wizard" (Chiến thuật)**: Tính toán xác suất (Pot Odds) & sức mạnh bộ bài trước khi ra quyết định.
3. **Charlie "The Knight" (Cẩn trọng)**: Chơi chắc chắn (Tight-Passive), sẵn sàng Fold bài yếu từ sớm.

### Khả năng mở rộng AI trong tương lai:
Module `backend/ai_agent.py` được thiết kế sẵn hook `get_llm_decision_hook` giúp dễ dàng kết nối với các mô hình AI tiên tiến như OpenAI GPT-4, Google Gemini, Ollama (Local LLM), hoặc các mô hình Học Máy Củng Cố (Reinforcement Learning - PyTorch).

---

## 🧪 Kiểm Thử Hệ Thống (Backend Testing)

Để kiểm tra logic tính toán các bộ bài (Royal Flush, Full House, Straight, Flush, Two Pair, etc.) và hành vi của AI:

```bash
.\.venv\Scripts\python.exe backend\test_backend.py
```

---

## 🖼️ Tải & Xử Lý Assets

- **Lá bài (`assets/cards.jpg`)**: Được cắt tự động thành grid 13 cột x 4 hàng tương ứng với 52 lá bài (Chuồn ♣, Bích ♠, Cơ ♥, Rô ♦).
- **Chip cược (`assets/chips.jpg`)**: Được tách thành 5 loại chip (Đỏ $5, Xanh lá $25, Xanh dương $50, Vàng $100, Đen $500) hiển thị chồng chip cược trực quan.
- **Khung cảnh lửa trại (`assets/style.jpg`)**: Render động bằng HTML5 Canvas với các hiệu ứng sao lấp lánh, đom đóm rực rỡ và đốm lửa trại bập bùng.
