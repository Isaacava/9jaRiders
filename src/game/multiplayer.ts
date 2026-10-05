export type RealtimeState = {
  roomId: string;
  hostId: string;
  status: "lobby" | "countdown" | "racing" | "finished";
  countdownMs: number | null;
  /** performance.now() when this update arrived (client side, used for interpolation) */
  at?: number;
  players: Array<{
    id: string;
    name: string;
    bikeId: string;
    riderId: string;
    ready: boolean;
    lane: number;
    speed: number;
    distance: number;
    multiplier: number;
    item: string | null;
    finishPosition: number | null;
  }>;
};

type Listener = (state: RealtimeState) => void;
type MessageListener = (message: Record<string, unknown>) => void;

let sharedClient: RealtimeClient | null = null;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private stateListener?: Listener;
  private messageListener?: MessageListener;
  private last: RealtimeState | null = null;
  private rtt = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /** smoothed round-trip time in ms (0 until the first pong) */
  getRtt() { return this.rtt; }

  constructor(
    private readonly url =
      process.env.NEXT_PUBLIC_REALTIME_URL ??
      "wss://aboki-riders-server.onrender.com"
  ) {}

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      const fail = () => reject(new Error("REALTIME_CONNECTION_FAILED"));

      socket.addEventListener("open", () => {
        resolve();
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping", t: performance.now() }));
        }, 2000);
      });
      socket.addEventListener("close", () => { if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; } });
      socket.addEventListener("error", fail);
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data)) as Record<string, unknown>;
          if (message.type === "pong" && typeof message.t === "number") {
            const sample = performance.now() - message.t;
            this.rtt = this.rtt ? this.rtt * 0.7 + sample * 0.3 : sample;
            return;
          }
          if (message.type === "room:snap" && this.last) {
            // compact delta: [lane, speed, distance, multiplier, finishPosition] per player, same order as the last full state
            const codes = ["lobby", "countdown", "racing", "finished"] as const;
            const rows = message.p as number[][];
            const next: RealtimeState = {
              ...this.last,
              status: codes[Number(message.s)] ?? this.last.status,
              countdownMs: typeof message.c === "number" ? message.c : null,
              at: performance.now(),
              players: this.last.players.map((p, i) => {
                const r = rows[i];
                return r ? { ...p, lane: r[0], speed: r[1], distance: r[2], multiplier: r[3], finishPosition: r[4] ? r[4] : null } : p;
              })
            };
            this.last = next;
            this.stateListener?.(next);
            return;
          }
          this.messageListener?.(message);

          if (message.type === "room:state" && message.state) {
            const full = { ...(message.state as RealtimeState), at: performance.now() };
            this.last = full;
            this.stateListener?.(full);
          }
        } catch {
          // Ignore malformed server frames.
        }
      });
    });
  }

  onState(listener: Listener) {
    this.stateListener = listener;
    return () => {
      if (this.stateListener === listener) this.stateListener = undefined;
    };
  }

  onMessage(listener: MessageListener) {
    this.messageListener = listener;
    return () => {
      if (this.messageListener === listener) this.messageListener = undefined;
    };
  }

  createRoom(name: string, loadout?: { bikeId: string; riderId: string }) {
    this.send({ type: "room:create", name, loadout });
  }

  joinRoom(
    roomId: string,
    name: string,
    loadout?: { bikeId: string; riderId: string }
  ) {
    this.send({
      type: "room:join",
      roomId: roomId.trim().toUpperCase(),
      name,
      loadout
    });
  }

  setReady(roomId: string, playerId: string, ready: boolean) {
    this.send({ type: "room:ready", roomId, playerId, ready });
  }

  startRace(roomId: string, playerId: string) {
    this.send({ type: "race:start", roomId, playerId });
  }

  sendInput(
    roomId: string,
    playerId: string,
    input: { steering: number; braking: boolean; useItem: boolean }
  ) {
    this.send({
      type: "race:input",
      roomId,
      playerId,
      input
    });
  }

  disconnect() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this.socket?.close();
    this.socket = null;
  }

  private send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("REALTIME_NOT_CONNECTED");
    }

    this.socket.send(JSON.stringify(payload));
  }
}

/** Wake the (free-tier, sleeping) realtime server early so the first multiplayer click isn't a 30-60 s cold start. */
let warmed = false;
export function prewarmServer() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const base = (process.env.NEXT_PUBLIC_REALTIME_URL ?? "wss://aboki-riders-server.onrender.com").replace(/^ws/, "http");
  try { void fetch(`${base}/health`, { mode: "no-cors", cache: "no-store" }).catch(() => {}); } catch { /* ignore */ }
}

export function getSharedRealtimeClient() {
  if (!sharedClient) {
    sharedClient = new RealtimeClient();
  }
  return sharedClient;
}
