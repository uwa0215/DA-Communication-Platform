"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getTargetUrl(): string {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
}

export function getSocket(): Socket {
  if (!socket && typeof window !== "undefined") {
    socket = io(getTargetUrl(), {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
  }
  return socket!;
}

export function useSocket() {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(socket);
  const [isConnected, setIsConnected] = useState(socket ? socket.connected : false);

  useEffect(() => {
    if (!socket && typeof window !== "undefined") {
      socket = io(getTargetUrl(), {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      });
    }
    setSocketInstance(socket);
    
    if (socket) {
      setIsConnected(socket.connected);
      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      return () => {
        socket?.off("connect", onConnect);
        socket?.off("disconnect", onDisconnect);
      };
    }
  }, []);

  return { socket: socketInstance, isConnected };
}
