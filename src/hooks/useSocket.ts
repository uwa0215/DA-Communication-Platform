"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket() {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(socket);

  useEffect(() => {
    if (!socket) {
      socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocketInstance(socket);
    }
    return () => {};
  }, []);

  return { socket: socketInstance };
}
