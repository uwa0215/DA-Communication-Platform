"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, Image as ImageIcon } from "lucide-react";

interface Props {
  onSelectGif: (url: string, title?: string) => void;
}

interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

const FEATURED_CATEGORIES = [
  { label: "🔥 Trending", query: "trending" },
  { label: "👍 Thumbs Up", query: "thumbs up" },
  { label: "😂 Laughing", query: "lol" },
  { label: "🎉 Celebrate", query: "celebrate" },
  { label: "❤️ Love", query: "love" },
  { label: "💃 Dancing", query: "dance" },
  { label: "🤯 Mind Blown", query: "mind blown" },
  { label: "👋 Waving", query: "wave" },
  { label: "👏 Clapping", query: "applause" },
  { label: "😭 Crying", query: "sad" },
  { label: "😎 Cool", query: "cool" },
];

// Fallback high quality animated GIFs for 100% offline & instant loading
const FALLBACK_GIFS: Record<string, GifItem[]> = {
  trending: [
    { id: "1", title: "Celebration", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", previewUrl: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "2", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "3", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "4", title: "Clapping", url: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Row/giphy.gif", previewUrl: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Row/giphy.gif" },
    { id: "5", title: "Dancing", url: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif", previewUrl: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif" },
    { id: "6", title: "Laughing", url: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif", previewUrl: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif" },
  ],
  "thumbs up": [
    { id: "t1", title: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "t2", title: "Cat Thumbs Up", url: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif", previewUrl: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" },
    { id: "t3", title: "Minion Thumbs Up", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  ],
  lol: [
    { id: "l1", title: "Laughing Out Loud", url: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif", previewUrl: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif" },
    { id: "l2", title: "Cat Laughing", url: "https://media.giphy.com/media/kC8N6DPOkbqWTxkNTe/giphy.gif", previewUrl: "https://media.giphy.com/media/kC8N6DPOkbqWTxkNTe/giphy.gif" },
  ]
};

export default function GifPicker({ onSelectGif }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("trending");
  const [gifs, setGifs] = useState<GifItem[]>(FALLBACK_GIFS["trending"]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const q = query.trim() || activeCategory;
    setLoading(true);

    const apiKey = "dc6zaTOxFJmzC"; // Giphy Beta Key
    const endpoint = query.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query.trim())}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(activeCategory)}&limit=20&rating=g`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (isCancelled) return;
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const list: GifItem[] = data.data.map((item: any) => ({
            id: item.id,
            title: item.title || "GIF",
            url: item.images?.downsized_medium?.url || item.images?.original?.url,
            previewUrl: item.images?.fixed_height_small?.url || item.images?.downsized_small?.url || item.images?.original?.url,
          }));
          setGifs(list);
        } else {
          setGifs(FALLBACK_GIFS[activeCategory] || FALLBACK_GIFS["trending"]);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setGifs(FALLBACK_GIFS[activeCategory] || FALLBACK_GIFS["trending"]);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query, activeCategory]);

  return (
    <div
      style={{
        width: typeof window !== "undefined" && window.innerWidth < 450 ? Math.min(320, window.innerWidth - 32) : 350,
        height: 380,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-panel, #0f172a)",
        color: "var(--text-primary, #ffffff)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      {/* Search Input */}
      <div style={{ padding: "12px 12px 8px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
          <input
            type="text"
            placeholder="Search GIFs on Giphy..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: 20,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              color: "#ffffff",
              fontSize: 13,
              outline: "none"
            }}
          />
        </div>

        {/* Categories Bar */}
        {!query && (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingTop: 8,
              paddingBottom: 4,
              scrollbarWidth: "none"
            }}
          >
            {FEATURED_CATEGORIES.map(cat => (
              <button
                key={cat.query}
                onClick={() => setActiveCategory(cat.query)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: activeCategory === cat.query ? "#10b981" : "rgba(255, 255, 255, 0.08)",
                  color: activeCategory === cat.query ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                  transition: "all 0.2s ease"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GIF Grid Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {loading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255, 255, 255, 0.5)" }}>
            <Loader2 size={20} className="spinner" />
            <span style={{ fontSize: 13 }}>Loading GIFs...</span>
          </div>
        ) : gifs.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255, 255, 255, 0.4)", padding: 20, textAlign: "center" }}>
            <ImageIcon size={32} />
            <span style={{ fontSize: 13 }}>No GIFs found. Try another search.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {gifs.map(gif => (
              <div
                key={gif.id}
                onClick={() => onSelectGif(gif.url, gif.title)}
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  height: 100,
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", fontSize: 10, color: "rgba(255, 255, 255, 0.35)", textAlign: "center" }}>
        Powered by Giphy · Trellis Meta Messenger
      </div>
    </div>
  );
}
