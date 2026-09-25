/**
 * Auto-Connecting Realtime WebSocket & REST Client for Campfire Poker
 */

class BackendClient {
  constructor() {
    const loc = (typeof window !== 'undefined' && window.location) ? window.location : null;
    if (loc && loc.origin && loc.origin.startsWith('http') && !loc.origin.includes(':5500') && !loc.origin.includes(':3000')) {
      this.baseUrl = loc.origin;
    } else {
      this.baseUrl = "http://127.0.0.1:8000";
    }

    this.wsUrl = this.baseUrl.replace(/^http/, "ws") + "/ws/poker";
    this.socket = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    
    this.onStateUpdate = null;
    this.onConnectionStatus = null;
  }

  init(onStateUpdate, onConnectionStatus) {
    this.onStateUpdate = onStateUpdate;
    this.onConnectionStatus = onConnectionStatus;
    this.connect();
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.onConnectionStatus) {
      this.onConnectionStatus(false, "🟡 CONNECTING...");
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log("🔌 Connected to Campfire Poker Server at", this.wsUrl);
        if (this.onConnectionStatus) {
          this.onConnectionStatus(true, "🟢 SERVER ONLINE");
        }
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'GAME_STATE_UPDATE' && this.onStateUpdate) {
            this.onStateUpdate(data.state, data.last_event);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        if (this.onConnectionStatus) {
          this.onConnectionStatus(false, "🔴 RECONNECTING...");
        }
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        this.isConnected = false;
        if (this.onConnectionStatus) {
          this.onConnectionStatus(false, "🔴 DISCONNECTED");
        }
      };

    } catch (e) {
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 2000);
    }
  }

  send(data) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  async setSeat(seatIdx) {
    if (this.send({ type: 'SET_SEAT', seat_idx: seatIdx })) return true;

    try {
      const res = await fetch(`${this.baseUrl}/api/game/seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_idx: seatIdx })
      });
      const data = await res.json();
      if (data && data.state && this.onStateUpdate) {
        this.onStateUpdate(data.state, "Seat updated");
      }
      return true;
    } catch (e) {
      console.warn("REST setSeat error:", e);
      return false;
    }
  }

  async startNewHand() {
    if (this.send({ type: 'START_HAND' })) return true;

    try {
      const res = await fetch(`${this.baseUrl}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data && data.state && this.onStateUpdate) {
        this.onStateUpdate(data.state, "Hand started via REST");
      }
      return true;
    } catch (e) {
      console.warn("REST start hand error:", e);
      return false;
    }
  }

  async executeAction(playerId, action, raiseAmount = 0) {
    if (this.send({
      type: 'PLAYER_ACTION',
      player_id: playerId,
      action: action,
      raise_amount: raiseAmount
    })) {
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          action: action,
          raise_amount: raiseAmount
        })
      });
      const data = await res.json();
      if (data && data.state && this.onStateUpdate) {
        this.onStateUpdate(data.state, data.message);
      }
      return true;
    } catch (e) {
      console.warn("REST execute action error:", e);
      return false;
    }
  }

  async resetTable() {
    if (this.send({ type: 'RESET_TABLE' })) return true;

    try {
      const res = await fetch(`${this.baseUrl}/api/game/reset`, { method: 'POST' });
      const data = await res.json();
      if (data && data.state && this.onStateUpdate) {
        this.onStateUpdate(data.state, "Table reset");
      }
      return true;
    } catch (e) {
      console.warn("REST reset error:", e);
      return false;
    }
  }
}

window.BackendClient = new BackendClient();
