"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Image as ImageIcon, X } from "lucide-react";

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
  { label: "🐶 Animals", query: "funny dog cat" },
  { label: "🍿 Memes", query: "memes" },
  { label: "👏 Clapping", query: "applause" },
  { label: "😭 Crying", query: "sad" },
  { label: "😎 Cool", query: "cool" },
];

export default function GifPicker({ onSelectGif }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("trending");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input by 300ms for smooth user typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch GIFs from internal API
  useEffect(() => {
    let isCancelled = false;
    const q = debouncedQuery || activeCategory;
    setLoading(true);

    fetch(`/api/gifs/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data?.gifs && Array.isArray(data.gifs)) {
          setGifs(data.gifs);
        } else {
          setGifs([]);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("GIF fetch error:", err);
          setGifs([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, activeCategory]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "360px",
        height: "390px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-panel, #0f172a)",
        color: "var(--text-primary, #ffffff)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* Search Input Bar */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              color: "rgba(255, 255, 255, 0.5)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search GIFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 32px 8px 36px",
              borderRadius: 20,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              color: "#ffffff",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--brand, #10b981)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                position: "absolute",
                right: 10,
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Featured Category Pills */}
        {!query && (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {FEATURED_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.query;
              return (
                <button
                  key={cat.query}
                  type="button"
                  onClick={() => setActiveCategory(cat.query)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isActive ? "var(--brand, #10b981)" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* GIF Grid Gallery */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            <Loader2 size={24} className="spinner" style={{ color: "var(--brand, #10b981)" }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Searching GIFs...</span>
          </div>
        ) : gifs.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "rgba(255, 255, 255, 0.4)",
              padding: 20,
              textAlign: "center",
            }}
          >
            <ImageIcon size={36} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>No GIFs found for "{debouncedQuery || activeCategory}"</span>
            <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>Try searching for funny, reaction, or happy</span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            {gifs.map((gif) => (
              <div
                key={gif.id}
                onClick={() => onSelectGif(gif.url, gif.title)}
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  height: 105,
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.borderColor = "var(--brand, #10b981)";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(16, 185, 129, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <img
                  src={gif.previewUrl || gif.url}
                  alt={gif.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                    opacity: 0,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0";
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {gif.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          fontSize: 10,
          color: "rgba(255, 255, 255, 0.4)",
          textAlign: "center",
          background: "rgba(0, 0, 0, 0.2)",
        }}
      >
        Meta Messenger GIF Search · Powered by Giphy & Tenor
      </div>
    </div>
  );
}
