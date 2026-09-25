# 🤖 AGENT.md - AI Agent & Developer Architecture Manual

This manual provides authoritative context and structural specifications for AI Agents and developers working on or extending the **Campfire Poker** repository.

---

## 🎯 System Architecture Overview

Campfire Poker is structured as a decoupled, multi-mode Texas Hold'em poker web application with a retro Pixel Art visual theme inspired by `assets/style.jpg`.

```
                  +-----------------------------------+
                  |        Campfire Poker UI          |
                  | HTML5 Canvas + Pixel CSS + JS SPA  |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
  (Offline Mode)                                      (Backend Mode)
  ClientPokerEngine                                  FastAPI Python Backend
  frontend/js/poker_game.js                          backend/main.py
                                                            |
                                              +-------------+-------------+
                                              |                           |
                                      poker_engine.py               ai_agent.py
                                   (Rules & Evaluation)       (AI Bot Personalities)
```

---

## 📁 Repository Directory Structure

- **`assets/`**: Source visual assets.
  - `style.jpg` (736x985): Art direction benchmark ("SUMMER NIGHT CAMPFIRE").
  - `cards.jpg` (736x303): 52-card spritesheet (13 cols x 4 rows).
  - `chips.jpg` (736x736): 5-chip spritesheet (Red, Yellow, Blue, Green, Black).
- **`backend/`**: Python 3.13 server environment.
  - `main.py`: FastAPI server, static file router, REST API & WebSockets connection manager.
  - `poker_engine.py`: Hand rank evaluator, deck shuffling, pot distribution, side pots, betting rounds.
  - `ai_agent.py`: Heuristic & Monte Carlo decision engine for AI bots (`alex`, `bella`, `charlie`) with LLM integration hook.
  - `test_backend.py`: Executable test suite for backend logic.
  - `requirements.txt`: Python package dependencies.
- **`frontend/`**: Web UI frontend.
  - `index.html`: Responsive single-page interface layout.
  - `styles.css`: Design system tokens, retro pixel box styles, animations.
  - `js/campfire_scene.js`: Canvas pixel animation loop (starry sky, pine tree silhouettes, glowing campfire, embers, fireflies).
  - `js/sprite_renderer.js`: UV offset slicing for `cards.jpg` and `chips.jpg`.
  - `js/audio_synth.js`: Web Audio API synthesizer for 8-bit SFX.
  - `js/poker_game.js`: Standalone client-side poker logic.
  - `js/backend_client.js`: REST + WebSocket API transport client.
  - `js/main.js`: UI binding & application orchestrator.
- **`.venv/`**: Python Virtual Environment containing installed packages (`fastapi`, `uvicorn`, `websockets`, `pydantic`).

---

## 🃏 Asset Slicing & Sprite Coordinate Specifications

### 1. Cards Sheet (`assets/cards.jpg`)
- **Total Resolution**: 736px x 303px
- **Grid Layout**: 13 Columns x 4 Rows
- **Card Dimensions**: Width ≈ `56.615px`, Height ≈ `75.75px`
- **Suit Mapping (Rows)**:
  - Row 0: `clubs` (♣)
  - Row 1: `spades` (♠)
  - Row 2: `hearts` (♥)
  - Row 3: `diamonds` (♦)
- **Rank Mapping (Cols)**:
  - Col 0: Ace (14)
  - Col 1..9: Ranks 2 through 10
  - Col 10: Jack (11)
  - Col 11: Queen (12)
  - Col 12: King (13)

### 2. Chips Sheet (`assets/chips.jpg`)
- **Total Resolution**: 736px x 736px
- **Chip Crop Coordinates**:
  - `red` ($5): `(x: 80, y: 190, size: 180)`
  - `yellow` ($100): `(x: 280, y: 190, size: 180)`
  - `blue` ($50): `(x: 480, y: 190, size: 180)`
  - `green` ($25): `(x: 180, y: 380, size: 180)`
  - `black` ($500): `(x: 380, y: 380, size: 180)`

---

## 🛠️ Backend API Endpoints & Schemas

### REST Endpoints
- `GET /api/health`: Returns server status and current game stage.
- `GET /api/game/state?player_id=p_human`: Returns table state tailored to current player.
- `POST /api/game/new`: Resets and starts a new hand.
- `POST /api/game/action`: Executes player action (`fold`, `check`, `call`, `raise`).
- `POST /api/ai/decide`: Requests AI decision and LLM reasoning hook data for a specified bot.

### WebSocket Endpoint
- `WS /ws/poker`: Real-time bidirectional socket. Broadcasts `GAME_STATE_UPDATE` events whenever game state changes.

---

## 🧠 AI Agent Decision Framework & LLM Integration Hook

The `backend/ai_agent.py` module encapsulates bot behavior:

```python
class AIPokerAgent:
    def decide_action(self, game_state: Dict[str, Any], player_id: str) -> Tuple[str, int]:
        # 1. Calculates hand strength (0.0 to 1.0)
        # 2. Computes pot odds
        # 3. Applies bot personality profile (aggression, bluff_rate, tightness)
        # 4. Returns (action_string, raise_amount)

    def get_llm_decision_hook(self, game_state: Dict[str, Any]) -> Dict[str, Any]:
        # Hook designed for future LLM integration (OpenAI API, Google Gemini, Ollama, PyTorch)
```

To connect an LLM or custom AI model:
1. Extend `get_llm_decision_hook` in `backend/ai_agent.py` to call external APIs or inference engines.
2. Format the game prompt with community cards, hole cards, pot odds, and opponent action history.
3. Parse structured JSON output from LLM into valid action (`fold`, `check`, `call`, `raise`).

---

## ⚡ Execution Guidelines for AI Agents

- **Python Virtual Environment**: Always execute backend scripts or tests using `.\.venv\Scripts\python.exe` (Windows) or `.venv/bin/python` (Unix).
- **Testing**: Before declaring any backend modifications complete, run `.\.venv\Scripts\python.exe backend\test_backend.py` to ensure zero regressions.
- **Frontend Code Quality**: Ensure `image-rendering: pixelated;` is maintained on all canvas rendering and CSS sprite elements to preserve pixel art fidelity.
