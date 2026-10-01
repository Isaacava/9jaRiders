export type RealtimeState = {
  roomId: string;
  hostId: string;
  status: "lobby" | "countdown" | "racing" | "finished";
  countdownMs: number | null;
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

      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", fail);
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data)) as Record<string, unknown>;
          this.messageListener?.(message);

          if (message.type === "room:state" && message.state) {
            this.stateListener?.(message.state as RealtimeState);
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

export function getSharedRealtimeClient() {
  if (!sharedClient) {
    sharedClient = new RealtimeClient();
  }
  return sharedClient;
}
