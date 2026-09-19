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

      // ===== MULTI-PARTICIPANT MEETING ROOM SOCKET EVENTS =====
      socket.on("join-meeting-room", ({ roomId, user }: { roomId: string; user: any }) => {
        const roomName = `meeting:${roomId}`;
        socket.join(roomName);
        
        // Fetch existing participants in the room
        const clients = io.sockets.adapter.rooms.get(roomName);
        const existingSockets = clients ? Array.from(clients).filter(id => id !== socket.id) : [];
        
        // Send existing room participants to newly joined user
        socket.emit("room-existing-participants", { existingSockets });
        
        // Broadcast new participant join to everyone else in room
        socket.to(roomName).emit("user-joined-meeting", {
          socketId: socket.id,
          user
        });
      });

      socket.on("leave-meeting-room", ({ roomId, userId }: { roomId: string; userId: string }) => {
        const roomName = `meeting:${roomId}`;
        socket.leave(roomName);
        socket.to(roomName).emit("user-left-meeting", { socketId: socket.id, userId });
      });

      socket.on("meeting-signal", ({ targetSocketId, signal, senderUser }: any) => {
        io.to(targetSocketId).emit("meeting-signal-receive", {
          senderSocketId: socket.id,
          signal,
          senderUser
        });
      });

      socket.on("meeting-media-update", ({ roomId, userId, isMuted, isVideoOff }: any) => {
        socket.to(`meeting:${roomId}`).emit("user-media-updated", {
          socketId: socket.id,
          userId,
          isMuted,
          isVideoOff
        });
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
