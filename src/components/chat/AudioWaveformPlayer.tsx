"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import styles from "./ChatArea.module.css";

interface AudioWaveformPlayerProps {
  src: string;
  isMine?: boolean;
}

export default function AudioWaveformPlayer({ src, isMine = false }: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 20,
        background: isMine ? "rgba(255, 255, 255, 0.2)" : "var(--bg-elevated)",
        border: "1px solid " + (isMine ? "rgba(255, 255, 255, 0.3)" : "var(--border)"),
        maxWidth: 280,
        color: isMine ? "#ffffff" : "var(--text-primary)",
      }}
    >
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: isMine ? "#ffffff" : "var(--brand)",
          color: isMine ? "var(--brand)" : "#ffffff",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      {/* Waveform visualizer bars */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = clickX / rect.width;
            audioRef.current.currentTime = pct * duration;
            setCurrentTime(pct * duration);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            height: 22,
            cursor: "pointer",
          }}
        >
          {[40, 70, 30, 90, 60, 100, 50, 80, 40, 90, 65, 30, 85, 50, 95, 70, 45, 80].map((h, i) => {
            const barPct = (i / 18) * 100;
            const active = barPct <= progressPct;
            return (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 4,
                  background: active
                    ? isMine ? "#ffffff" : "var(--brand)"
                    : isMine ? "rgba(255, 255, 255, 0.4)" : "var(--text-muted)",
                  transition: "height 0.15s ease, background 0.15s ease",
                }}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.85 }}>
          <span>{formatTime(currentTime > 0 ? currentTime : duration)}</span>
          <span style={{ fontWeight: 600 }}>Voice Note</span>
        </div>
      </div>

      {/* Speed control pill */}
      <button
        type="button"
        onClick={toggleSpeed}
        style={{
          padding: "2px 6px",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          background: isMine ? "rgba(255, 255, 255, 0.25)" : "var(--bg-hover)",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          flexShrink: 0,
        }}
        title="Playback Speed"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
}
