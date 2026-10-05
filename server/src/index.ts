import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import { RoomManager, type PlayerInput } from "./room.js";

const PORT = Number(process.env.PORT ?? 8080);
const rooms = new RoomManager();

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      ok: true,
      service: "aboki-riders-server",
      rooms: rooms.listRoomIds().length
    }));
    return;
  }

  response.writeHead(404);
  response.end();
});

// No per-message compression (adds latency + CPU for tiny frames); small payload cap protects the server.
const server = new WebSocketServer({ server: httpServer, perMessageDeflate: false, maxPayload: 4096 });

// Drop half-open connections (very common on mobile networks) so dead players don't stall rooms.
const alive = new WeakMap<WebSocket, boolean>();
setInterval(() => {
  for (const client of server.clients) {
    if (alive.get(client) === false) { client.terminate(); continue; }
    alive.set(client, false);
    try { client.ping(); } catch { /* ignore */ }
  }
}, 15000);

type ClientMessage =
  | { type: "ping"; t?: number }
  | { type: "room:create"; name?: string; loadout?: { bikeId?: string; riderId?: string } }
  | { type: "room:join"; roomId?: string; name?: string; loadout?: { bikeId?: string; riderId?: string } }
  | { type: "room:ready"; roomId?: string; playerId?: string; ready?: boolean }
  | { type: "race:start"; roomId?: string; playerId?: string }
  | { type: "race:input"; roomId?: string; playerId?: string; input?: PlayerInput };

const send = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
};

server.on("connection", (socket) => {
  alive.set(socket, true);
  socket.on("pong", () => alive.set(socket, true));
  socket.on("error", () => { /* handled by close */ });
  send(socket, {
    type: "server:ready",
    game: "aboki-riders",
    version: "0.3.0",
    maxPlayers: 8
  });

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as ClientMessage;

      if (message.type === "ping") {
        alive.set(socket, true);
        send(socket, { type: "pong", at: Date.now(), t: message.t });
        return;
      }

      if (message.type === "room:create") {
        const created = rooms.createRoom(socket, message.name ?? "Rider", message.loadout);
        send(socket, {
          type: "room:created",
          roomId: created.roomId,
          playerId: created.playerId,
          host: true
        });
        return;
      }

      if (message.type === "room:join") {
        if (!message.roomId) throw new Error("ROOM_ID_REQUIRED");

        const joined = rooms.joinRoom(message.roomId, socket, message.name ?? "Rider", message.loadout);
        send(socket, {
          type: "room:joined",
          roomId: joined.room.id,
          playerId: joined.playerId,
          host: joined.room.hostId === joined.playerId
        });
        rooms.broadcastSnapshot(joined.room);
        return;
      }

      if (message.type === "room:ready") {
        if (!message.roomId || !message.playerId) throw new Error("ROOM_CONTEXT_REQUIRED");

        const room = rooms.markReady(
          message.roomId,
          message.playerId,
          message.ready !== false
        );

        rooms.broadcastSnapshot(room);
        return;
      }

      if (message.type === "race:start") {
        if (!message.roomId || !message.playerId) throw new Error("ROOM_CONTEXT_REQUIRED");

        const room = rooms.startRace(message.roomId, message.playerId);
        rooms.broadcast(room, {
          type: "race:countdown",
          ms: 3000
        });
        rooms.broadcastSnapshot(room);
        return;
      }

      if (message.type === "race:input") {
        if (!message.roomId || !message.playerId || !message.input) {
          throw new Error("INPUT_CONTEXT_REQUIRED");
        }

        rooms.applyInput(message.roomId, message.playerId, message.input);
        return;
      }

      send(socket, { type: "error", code: "UNKNOWN_MESSAGE" });
    } catch (error) {
      const code = error instanceof Error ? error.message : "SERVER_ERROR";
      send(socket, { type: "error", code });
    }
  });

  socket.on("close", () => {
    const left = rooms.leave(socket);
    if (left?.room) rooms.broadcastSnapshot(left.room);
  });
});

// 20 Hz simulation. Racing/countdown rooms get the compact delta every tick and a full state once a second
// (resync); lobby/finished rooms only need a slow heartbeat (state changes are broadcast by the handlers above).
let tickN = 0;
setInterval(() => {
  rooms.tick();
  tickN++;
  for (const roomId of rooms.listRoomIds()) {
    const room = rooms.getRoom(roomId);
    if (!room) continue;
    if (room.status === "racing" || room.status === "countdown") {
      if (tickN % 20 === 0) rooms.broadcastSnapshot(room);
      else rooms.broadcast(room, rooms.compactSnapshot(room));
    } else if (tickN % 40 === 0) {
      rooms.broadcastSnapshot(room);
    }
  }
}, 50);

httpServer.listen(PORT, () => {
  console.log(`Aboki Riders realtime server listening on :${PORT}`);
});
