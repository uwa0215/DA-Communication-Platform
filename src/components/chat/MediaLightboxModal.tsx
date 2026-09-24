"use client";

import { X, Download, Maximize2, ExternalLink } from "lucide-react";
import Image from "next/image";

interface MediaLightboxModalProps {
  url: string;
  type?: string;
  fileName?: string;
  onClose: () => void;
}

export default function MediaLightboxModal({ url, type = "image", fileName, onClose }: MediaLightboxModalProps) {
  const isVideo = type.startsWith("video/") || /\.(mp4|webm|mov)($|\?)/i.test(url);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.2s ease forwards",
      }}
      onClick={onClose}
    >
      {/* Lightbox Header */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "white",
          zIndex: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fileName || (isVideo ? "Video Attachment" : "Photo Attachment")}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href={url}
            download={fileName || "download"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-icon"
            style={{ color: "white", background: "rgba(255,255,255,0.15)", padding: 8, borderRadius: "50%" }}
            title="Download File"
          >
            <Download size={18} />
          </a>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ color: "white", background: "rgba(255,255,255,0.15)", padding: 8, borderRadius: "50%" }}
            title="Close Lightbox"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Lightbox Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            style={{
              maxWidth: "95%",
              maxHeight: "85vh",
              borderRadius: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          />
        ) : (
          <img
            src={url}
            alt={fileName || "Media Lightbox"}
            style={{
              maxWidth: "95%",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "scalePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          />
        )}
      </div>
    </div>
  );
}
