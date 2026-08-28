"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<{ title?: string; description?: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading || !data || (!data.title && !data.description && !data.image)) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{
        display: "block",
        marginTop: 8,
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        background: "var(--bg-card)",
        maxWidth: 300,
      }}
    >
      {data.image && (
        <div style={{ position: "relative", width: "100%", height: 150, backgroundColor: "var(--bg-hover)" }}>
          <Image src={data.image} alt={data.title || "Link preview"} fill style={{ objectFit: "cover" }} unoptimized />
        </div>
      )}
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }} className="line-clamp-1">{data.title || url}</div>
        {data.description && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }} className="line-clamp-2">
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}
