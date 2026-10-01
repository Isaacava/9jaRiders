import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import { RoomManager, type PlayerInput } from "./room.js";

const PORT = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port: PORT });
const rooms = new RoomManager();

type ClientMessage =
  | { type: "ping" }
  | { type: "room:create"; name?: string; loadout?: { bikeId?: string; riderId?: string } }
  | { type: "room:join"; roomId?: string; name?: string; loadout?: { bikeId?: string; riderId?: string } }
  | { type: "room:ready"; roomId?: string; playerId?: string; ready?: boolean }
  | { type: "race:start"; roomId?: string; playerId?: string }
  | { type: "race:input"; roomId?: string; playerId?: string; input?: PlayerInput };

const send = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
};

server.on("connection", (socket) => {
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
        send(socket, { type: "pong", at: Date.now() });
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

setInterval(() => {
  rooms.tick();

  for (const roomId of rooms.listRoomIds()) {
    const room = rooms.getRoom(roomId);
    if (room) rooms.broadcastSnapshot(room);
  }
}, 50);

console.log(`Aboki Riders realtime server listening on :${PORT}`);
