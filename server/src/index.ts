import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);
const server = new WebSocketServer({ port: PORT });

server.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "server:ready",
      game: "aboki-riders",
      version: "0.1.0"
    })
  );

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { type?: string };

      if (message.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", at: Date.now() }));
      }
    } catch {
      socket.send(
        JSON.stringify({
          type: "error",
          code: "INVALID_MESSAGE"
        })
      );
    }
  });
});

console.log(`Aboki Riders realtime server listening on :${PORT}`);
