// Custom server for Next.js + Socket.io
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Make io accessible globally
  global.io = io;

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join-user", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("join-channel", (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("leave-channel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("join-dm", (roomId) => {
      socket.join(`dm:${roomId}`);
    });

    socket.on("leave-dm", (roomId) => {
      socket.leave(`dm:${roomId}`);
    });

    socket.on("presence-update", ({ userId, status }) => {
      io.emit("user-presence", { userId, status });
    });

    socket.on("typing-start", ({ channelId, userId, userName }) => {
      socket.to(`channel:${channelId}`).emit("user-typing", { userId, userName });
    });

    socket.on("typing-stop", ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit("user-stop-typing", { userId });
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n🚀 CompanyChat running at http://${hostname}:${port}`);
    console.log(`⚡ Socket.io WebSocket server ready`);
  });
});
