import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest } from "next";

export type NextApiResponseWithSocket = {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

let io: SocketIOServer;

export function getSocketIO(server: NetServer): SocketIOServer {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      // Join user's personal room
      socket.on("join-user", (userId: string) => {
        socket.join(`user:${userId}`);
      });

      // Join channel room
      socket.on("join-channel", (channelId: string) => {
        socket.join(`channel:${channelId}`);
      });

      // Leave channel room
      socket.on("leave-channel", (channelId: string) => {
        socket.leave(`channel:${channelId}`);
      });

      // Join DM room
      socket.on("join-dm", (roomId: string) => {
        socket.join(`dm:${roomId}`);
      });

      // Presence update
      socket.on("presence-update", (data: { userId: string; status: string }) => {
        io.emit("user-presence", data);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });
  }

  return io;
}

export { io };
