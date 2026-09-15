export function getUserPresenceStatus(userId: string): "online" | "away" | "offline" {
  if (typeof global === "undefined") return "offline";

  const userSockets = (global as any).userSockets as Map<string, Set<string>> | undefined;
  const userStatuses = (global as any).userStatuses as Map<string, string> | undefined;

  if (userSockets && userSockets.has(userId)) {
    const sockets = userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      const st = userStatuses?.get(userId);
      if (st && (st === "online" || st === "away" || st === "offline")) {
        return st;
      }
      return "online";
    }
  }

  return "offline";
}
