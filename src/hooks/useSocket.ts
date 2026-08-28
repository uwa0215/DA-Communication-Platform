"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket() {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(socket);

  const [isConnected, setIsConnected] = useState(socket ? socket.connected : false);

  useEffect(() => {
    if (!socket) {
      socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocketInstance(socket);
    }
    
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
