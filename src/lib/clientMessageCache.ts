// clientMessageCache.ts — High-performance client-side in-memory chat cache & preloader
export interface CachedChat {
  messages: any[];
  hasMore: boolean;
  fetchedAt: number;
}

const clientMessageCache = new Map<string, CachedChat>();

export function getClientCachedMessages(apiBase: string): CachedChat | undefined {
  return clientMessageCache.get(apiBase);
}

export function setClientCachedMessages(apiBase: string, messages: any[], hasMore: boolean) {
  clientMessageCache.set(apiBase, {
    messages,
    hasMore,
    fetchedAt: Date.now(),
  });
}

export function prefetchChatMessages(apiBase: string) {
  if (typeof window === "undefined" || !apiBase) return;
  const existing = clientMessageCache.get(apiBase);
  // Avoid duplicate fetches if fetched less than 10 seconds ago
  if (existing && Date.now() - existing.fetchedAt < 10000) return;

  fetch(apiBase)
    .then(res => res.json())
    .then(data => {
      if (data.messages && Array.isArray(data.messages)) {
        setClientCachedMessages(apiBase, data.messages, data.messages.length === 50);
      }
    })
    .catch(() => {});
}
