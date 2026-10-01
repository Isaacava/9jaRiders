import type WebSocket from "ws";

export type RoomStatus = "lobby" | "countdown" | "racing" | "finished";

export type PlayerInput = {
  steering: number;
  braking: boolean;
  useItem: boolean;
};

export type RoomPlayer = {
  id: string;
  name: string;
  socket: WebSocket;
  ready: boolean;
  lane: number;
  steering: number;
  braking: boolean;
  speed: number;
  distance: number;
  multiplier: number;
  item: string | null;
  boostUntil: number;
  finishPosition: number | null;
};

export type RoomSnapshot = {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  countdownMs: number | null;
  players: Array<{
    id: string;
    name: string;
    ready: boolean;
    lane: number;
    speed: number;
    distance: number;
    multiplier: number;
    item: string | null;
    finishPosition: number | null;
  }>;
};

export type RaceRoom = {
  id: string;
  hostId: string;
  createdAt: number;
  status: RoomStatus;
  countdownEndsAt: number | null;
  players: Map<string, RoomPlayer>;
};

const MAX_PLAYERS = 8;
const GOAL_DISTANCE = 5000;
const BASE_SPEED = 5.4;

export class RoomManager {
  private rooms = new Map<string, RaceRoom>();

  createRoom(socket: WebSocket, playerName: string) {
    const id = this.makeRoomId();
    const playerId = this.makePlayerId();

    const player: RoomPlayer = {
      id: playerId,
      name: this.cleanName(playerName),
      socket,
      ready: true,
      lane: 0.5,
      steering: 0,
      braking: false,
      speed: BASE_SPEED,
      distance: 0,
      multiplier: 1,
      item: null,
      boostUntil: 0,
      finishPosition: null
    };

    this.rooms.set(id, {
      id,
      hostId: playerId,
      createdAt: Date.now(),
      status: "lobby",
      countdownEndsAt: null,
      players: new Map([[playerId, player]])
    });

    return { roomId: id, playerId };
  }

  joinRoom(roomId: string, socket: WebSocket, playerName: string) {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "lobby") throw new Error("RACE_ALREADY_STARTED");
    if (room.players.size >= MAX_PLAYERS) throw new Error("ROOM_FULL");

    const playerId = this.makePlayerId();
    room.players.set(playerId, {
      id: playerId,
      name: this.cleanName(playerName),
      socket,
      ready: false,
      lane: this.spawnLane(room.players.size),
      steering: 0,
      braking: false,
      speed: BASE_SPEED,
      distance: 0,
      multiplier: 1,
      item: null,
      boostUntil: 0,
      finishPosition: null
    });

    return { room, playerId };
  }

  markReady(roomId: string, playerId: string, ready: boolean) {
    const room = this.requirePlayer(roomId, playerId);
    room.player.ready = ready;
    return room.room;
  }

  startRace(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostId !== playerId) throw new Error("HOST_ONLY");
    if (room.status !== "lobby") throw new Error("RACE_ALREADY_STARTED");

    room.status = "countdown";
    room.countdownEndsAt = Date.now() + 3000;
    return room;
  }

  applyInput(roomId: string, playerId: string, input: PlayerInput) {
    const room = this.requirePlayer(roomId, playerId);

    if (room.room.status !== "racing") return;

    room.player.steering = Math.max(-1, Math.min(1, Number(input.steering) || 0));
    room.player.braking = Boolean(input.braking);

    if (Boolean(input.useItem) && room.player.item) {
      const item = room.player.item;
      room.player.item = null;

      if (item === "nitro") room.player.boostUntil = Date.now() + 1800;
      if (item === "mega") room.player.boostUntil = Date.now() + 2700;
      if (item === "surge") {
        room.player.boostUntil = Date.now() + 1200;
        room.player.multiplier = Math.min(99.99, room.player.multiplier + 0.5);
      }
    }
  }

  leave(socket: WebSocket) {
    for (const [roomId, room] of this.rooms) {
      for (const [playerId, player] of room.players) {
        if (player.socket !== socket) continue;

        room.players.delete(playerId);

        if (room.hostId === playerId) {
          const nextHost = room.players.values().next().value as RoomPlayer | undefined;
          if (nextHost) room.hostId = nextHost.id;
        }

        if (room.players.size === 0) {
          this.rooms.delete(roomId);
        }

        return { room, playerId };
      }
    }

    return null;
  }

  tick() {
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      if (room.status === "countdown" && room.countdownEndsAt && now >= room.countdownEndsAt) {
        room.status = "racing";
        room.countdownEndsAt = null;
      }

      if (room.status === "racing") {
        this.simulateRoom(room, 0.05, now);

        const racers = [...room.players.values()];
        if (racers.length > 0 && racers.every((player) => player.finishPosition !== null)) {
          room.status = "finished";
        }
      }

      if (room.status === "finished" && now - room.createdAt > 30 * 60 * 1000) {
        this.rooms.delete(roomId);
      }
    }
  }

  snapshot(roomId: string): RoomSnapshot {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const countdownMs =
      room.status === "countdown" && room.countdownEndsAt
        ? Math.max(0, room.countdownEndsAt - Date.now())
        : null;

    return {
      roomId: room.id,
      hostId: room.hostId,
      status: room.status,
      countdownMs,
      players: [...room.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
        ready: player.ready,
        lane: player.lane,
        speed: Number(player.speed.toFixed(2)),
        distance: Number(player.distance.toFixed(2)),
        multiplier: Number(player.multiplier.toFixed(3)),
        item: player.item,
        finishPosition: player.finishPosition
      }))
    };
  }

  broadcast(room: RaceRoom, message: unknown) {
    const encoded = JSON.stringify(message);
    for (const player of room.players.values()) {
      if (player.socket.readyState === 1) player.socket.send(encoded);
    }
  }

  broadcastSnapshot(room: RaceRoom) {
    this.broadcast(room, {
      type: "room:state",
      state: this.snapshot(room.id)
    });
  }

  private simulateRoom(room: RaceRoom, dt: number, now: number) {
    const finishedCount = [...room.players.values()].filter((player) => player.finishPosition !== null).length;

    for (const player of room.players.values()) {
      if (player.finishPosition !== null) continue;

      const targetSpeed = player.braking
        ? BASE_SPEED * 0.56
        : now < player.boostUntil
          ? 9.4
          : BASE_SPEED;

      player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 5);
      player.lane = Math.max(0.17, Math.min(0.83, player.lane + player.steering * dt * 0.9));
      player.distance = Math.min(GOAL_DISTANCE, player.distance + player.speed * dt * 9);

      const multiplierRate = now < player.boostUntil ? 0.022 : 0.012;
      player.multiplier = Math.min(99.99, player.multiplier + multiplierRate * dt * player.speed);

      if (player.distance >= GOAL_DISTANCE) {
        player.finishPosition = finishedCount + 1;
      }
    }
  }

  private requirePlayer(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const player = room.players.get(playerId);
    if (!player) throw new Error("PLAYER_NOT_IN_ROOM");

    return { room, player };
  }

  private makeRoomId() {
    let id = "";
    do {
      id = Math.random().toString(36).slice(2, 8).toUpperCase();
    } while (this.rooms.has(id));
    return id;
  }

  private makePlayerId() {
    return Math.random().toString(36).slice(2, 12);
  }

  private spawnLane(index: number) {
    const lanes = [0.22, 0.36, 0.5, 0.64, 0.78];
    return lanes[index % lanes.length];
  }

  private cleanName(name: string) {
    return String(name || "Rider").trim().slice(0, 18) || "Rider";
  }
}
