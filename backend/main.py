"""
Campfire Poker - FastAPI Server & WebSocket Game Hub
Serves REST API, Real-Time WebSockets, AI Bot Orchestration, Dynamic Seating, and Static Web Assets.
"""
import os
import sys
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from poker_engine import PokerEngine, Player
from ai_agent import AIPokerAgent
from poker_evaluator import Card, evaluate_best_hand

app = FastAPI(
    title="Campfire Poker Server",
    description="Real-time Texas Hold'em Poker Backend with AI Opponents and WebSocket sync",
    version="2.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Game State & AI Agents
game_engine = PokerEngine(small_blind=10, big_blind=20)
ai_bots: Dict[str, AIPokerAgent] = {}
ai_task: Optional[asyncio.Task] = None

def initialize_table(hero_seat: int = 0):
    global game_engine, ai_bots
    game_engine = PokerEngine(small_blind=10, big_blind=20)
    ai_bots = {
        'bot_alex': AIPokerAgent('alex'),
        'bot_bella': AIPokerAgent('bella'),
        'bot_charlie': AIPokerAgent('charlie')
    }

    # Add default 4 seats
    game_engine.add_player(Player('p_human', 'You (Hero)', chips=1000, is_ai=False, avatar='hero', seat_idx=0))
    game_engine.add_player(Player('bot_alex', 'Alex "The Rogue"', chips=1000, is_ai=True, avatar='rogue', seat_idx=1))
    game_engine.add_player(Player('bot_bella', 'Bella "The Wizard"', chips=1000, is_ai=True, avatar='wizard', seat_idx=2))
    game_engine.add_player(Player('bot_charlie', 'Charlie "The Knight"', chips=1000, is_ai=True, avatar='knight', seat_idx=3))

    if hero_seat != 0:
        game_engine.set_hero_seat(hero_seat)

    print(f"[SERVER] Table initialized with 4 seats (Hero at Seat {hero_seat}).")

initialize_table(0)

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS] Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_state(self, last_event: str = ""):
        state = game_engine.get_state(current_player_id="p_human")
        msg = {
            'type': 'GAME_STATE_UPDATE',
            'state': state,
            'last_event': last_event
        }
        for ws in list(self.active_connections):
            try:
                await ws.send_json(msg)
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()

# AI Loop Processor
async def process_ai_turns_loop():
    while game_engine.stage not in ['WAITING', 'SHOWDOWN', 'ENDED']:
        await asyncio.sleep(0.65)

        if not game_engine.players:
            break

        curr_p = game_engine.players[game_engine.current_player_idx]

        if not curr_p.is_ai or curr_p.folded or curr_p.is_all_in:
            break

        bot_agent = ai_bots.get(curr_p.id, AIPokerAgent('bella'))
        full_state = game_engine.get_state(current_player_id="p_human")

        action, raise_amt = bot_agent.decide_action(full_state, curr_p.id)
        success, msg = game_engine.execute_action(curr_p.id, action, raise_amt)

        print(f"[AI] {curr_p.name} -> {action.upper()} (raise: ${raise_amt}). Result: {msg}")
        await manager.broadcast_state(last_event=f"{curr_p.name} {action}ed" if action != 'fold' else f"{curr_p.name} folded")

        if game_engine.stage in ['SHOWDOWN', 'ENDED', 'WAITING']:
            break

def trigger_ai_processor():
    global ai_task
    if ai_task is None or ai_task.done():
        ai_task = asyncio.create_task(process_ai_turns_loop())


# Request Schemas
class ActionPayload(BaseModel):
    player_id: str = "p_human"
    action: str
    raise_amount: int = 0

class SeatPayload(BaseModel):
    seat_idx: int

class EvalPayload(BaseModel):
    cards: List[Dict[str, Any]]


# Favicon
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    icon_path = os.path.join(assets_dir, "web-icon.jpg")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/jpeg")
    svg_icon = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>"""
    return Response(content=svg_icon, media_type="image/svg+xml")

# System & Info Endpoints
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": "Campfire Poker Backend",
        "stage": game_engine.stage,
        "pot": game_engine.pot,
        "hero_seat": game_engine.hero_seat_idx,
        "players": len(game_engine.players)
    }

@app.get("/api/game/state", tags=["Game"])
def get_game_state(player_id: str = "p_human"):
    return game_engine.get_state(current_player_id=player_id)

@app.post("/api/game/seat", tags=["Game"])
async def set_seat(payload: SeatPayload):
    """Sets Hero's seat (0: South, 1: West, 2: North, 3: East) before hand starts."""
    success = game_engine.set_hero_seat(payload.seat_idx)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot change seat while hand is in progress.")
    
    state = game_engine.get_state(current_player_id="p_human")
    seat_names = ["South Log", "West Log", "North Log", "East Log"]
    s_name = seat_names[payload.seat_idx] if payload.seat_idx < len(seat_names) else f"Seat {payload.seat_idx}"
    await manager.broadcast_state(last_event=f"👑 Hero took seat at {s_name}.")
    return {"success": True, "hero_seat_idx": payload.seat_idx, "state": state}

@app.post("/api/game/start", tags=["Game"])
async def start_hand():
    current_seat = game_engine.hero_seat_idx
    success = game_engine.start_new_hand()
    if not success:
        initialize_table(current_seat)
        game_engine.start_new_hand()

    state = game_engine.get_state(current_player_id="p_human")
    await manager.broadcast_state(last_event="🔥 New hand started!")
    trigger_ai_processor()
    return {"success": True, "state": state}

@app.post("/api/game/action", tags=["Game"])
async def player_action(payload: ActionPayload):
    if game_engine.stage in ['WAITING', 'SHOWDOWN', 'ENDED']:
        raise HTTPException(status_code=400, detail="Hand is not active. Click Deal Hand to start.")

    success, msg = game_engine.execute_action(payload.player_id, payload.action, payload.raise_amount)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    state = game_engine.get_state(current_player_id="p_human")
    await manager.broadcast_state(last_event=f"{payload.player_id} performed {payload.action}")
    trigger_ai_processor()
    return {"success": True, "message": msg, "state": state}

@app.post("/api/game/reset", tags=["Game"])
async def reset_table():
    current_seat = game_engine.hero_seat_idx
    initialize_table(current_seat)
    state = game_engine.get_state(current_player_id="p_human")
    await manager.broadcast_state(last_event="🔄 Table reset to $1,000 per player.")
    return {"success": True, "state": state}

@app.post("/api/ai/eval-hand", tags=["AI"])
def eval_cards(payload: EvalPayload):
    card_objs = [Card(c['suit'], c['rank']) for c in payload.cards]
    score, tiebreakers, desc, best_5 = evaluate_best_hand(card_objs)
    return {
        "score": score,
        "tiebreakers": tiebreakers,
        "description": desc,
        "best_cards": [c.to_dict() for c in best_5]
    }

# WebSocket Endpoint
@app.websocket("/ws/poker")
async def websocket_poker(ws: WebSocket):
    await manager.connect(ws)
    await ws.send_json({
        'type': 'GAME_STATE_UPDATE',
        'state': game_engine.get_state(current_player_id="p_human"),
        'last_event': 'Connected to Campfire Poker Server'
    })

    try:
        while True:
            data = await ws.receive_json()
            event_type = data.get('type')

            if event_type == 'START_HAND':
                game_engine.start_new_hand()
                await manager.broadcast_state(last_event="🔥 New hand started via WebSocket!")
                trigger_ai_processor()

            elif event_type == 'SET_SEAT':
                s_idx = data.get('seat_idx', 0)
                game_engine.set_hero_seat(s_idx)
                seat_names = ["South Log", "West Log", "North Log", "East Log"]
                s_name = seat_names[s_idx] if s_idx < len(seat_names) else f"Seat {s_idx}"
                await manager.broadcast_state(last_event=f"👑 Hero moved to {s_name}.")

            elif event_type == 'PLAYER_ACTION':
                p_id = data.get('player_id', 'p_human')
                action = data.get('action')
                amt = data.get('raise_amount', 0)
                success, msg = game_engine.execute_action(p_id, action, amt)
                if success:
                    await manager.broadcast_state(last_event=f"{p_id} {action}")
                    trigger_ai_processor()

            elif event_type == 'RESET_TABLE':
                current_seat = game_engine.hero_seat_idx
                initialize_table(current_seat)
                await manager.broadcast_state(last_event="🔄 Table reset.")

    except WebSocketDisconnect:
        manager.disconnect(ws)


# Mount Static Frontend & Assets
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
frontend_dir = os.path.join(root_dir, "frontend")
assets_dir = os.path.join(root_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
