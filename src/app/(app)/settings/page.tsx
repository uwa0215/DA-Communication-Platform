"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  User, MessageSquare, Bell, Shield, Video, Lock, Camera, Save, 
  Check, Volume2, Moon, Sun, Smartphone, Monitor, Eye, Mic, MicOff, 
  Sparkles, Clock, AlertCircle, Trash2, LogOut, CheckCircle2
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { loadSettings, saveSettings, ChatSettings } from "@/lib/settingsStore";
import { playMessageChime, playCallRingtone } from "@/lib/audioEffects";
import { mutate } from "swr";
import UserAvatar from "@/components/UserAvatar";
import styles from "./settings.module.css";

export default function SettingsPage() {
  // Core Profile States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [unit, setUnit] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Messenger Settings Store State
  const [messengerSettings, setMessengerSettings] = useState<ChatSettings>(loadSettings());

  // Audio / Mic Hardware Stream Test
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setMessengerSettings(loadSettings());

    try {
      const b = localStorage.getItem("trellis_blockedUsers");
      if (b) setBlockedUserIds(JSON.parse(b));
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [res, usersRes] = await Promise.all([
          fetch("/api/users/me"),
          fetch("/api/users")
        ]);
        const data = await res.json();
        const usersData = await usersRes.json();

        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setJobTitle(data.user.jobTitle || "");
          setDepartment(data.user.department || "");
          setUnit(data.user.unit || "");
          setAvatar(data.user.avatar || "");
          setCustomStatus(data.user.customStatus || "");
        }
        if (usersData.users) {
          setAllUsers(usersData.users);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setFetching(false);
      }
    }
    fetchProfile();
  }, []);

  // Web Audio API Microphone Stream Capture & Level Analysis
  const toggleMicTest = async () => {
    if (isMicTesting) {
      // Stop test & release mic hardware
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setIsMicTesting(false);
      setMicLevel(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        setIsMicTesting(true);

        const updateMeter = () => {
          if (!micStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const pct = Math.min(100, Math.round((average / 128) * 100));
          setMicLevel(pct);
          requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        console.error("Could not access microphone", err);
        setError("Microphone access permission denied or no audio device found.");
      }
    }
  };

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleUpdateSetting = (key: keyof ChatSettings, value: any) => {
    const updated = saveSettings({ [key]: value });
    setMessengerSettings(updated);
    if (key === "playSounds" && value) {
      playMessageChime();
    } else if (key === "callRingtone" && value) {
      playCallRingtone();
    }
  };

  const handleUpdateQuietHours = (field: "enabled" | "start" | "end", val: any) => {
    const nextQuiet = { ...messengerSettings.quietHours, [field]: val };
    const updated = saveSettings({ quietHours: nextQuiet });
    setMessengerSettings(updated);
  };

  const handleUnblock = (id: string) => {
    const next = blockedUserIds.filter(userId => userId !== id);
    setBlockedUserIds(next);
    localStorage.setItem("trellis_blockedUsers", JSON.stringify(next));
  };

  const compressImageForMobile = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("Processing & uploading profile picture...");
    setError("");

    try {
      // Compress phone image (converts 15MB HEIC/JPG to lightweight ~150KB JPEG blob)
      const compressedBlob = await compressImageForMobile(file);
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", compressedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadRes.ok && uploadData.url) {
        setAvatar(uploadData.url);

        // Auto-save updated profile photo immediately to database
        const saveRes = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: uploadData.url }),
        });

        if (saveRes.ok) {
          setMessage("Profile picture updated successfully!");
          mutate("/api/users/me");
          mutate("/api/users");
        } else {
          setMessage("Photo uploaded! Click 'Save Changes' below to finalize.");
        }
      } else {
        setError(uploadData.error || "Failed to upload photo.");
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      setError("Failed to process profile photo. Please try another image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          jobTitle,
          department,
          unit,
          avatar,
          customStatus,
          password: password ? password : undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Settings saved successfully!");
        setPassword("");
        mutate("/api/users/me");
        mutate("/api/users");
      } else {
        setError(data.error || "Failed to update settings");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (fetching) {
    return (
      <div className={styles.settingsPage}>
        <div className="skeleton" style={{ height: 400, width: "100%", maxWidth: 720, borderRadius: 24 }}></div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsHeader}>
        <h1 className={styles.settingsTitle}>Preferences & Settings</h1>
        <p className={styles.settingsSub}>Manage your profile, chat theme, privacy, and calling features</p>
      </div>

      {/* Tabs Bar */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "profile" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={16} /> Profile
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "chat" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare size={16} /> Chat & Theme
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "notifications" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={16} /> Notifications
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "privacy" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          <Shield size={16} /> Privacy & Safety
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "calls" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("calls")}
        >
          <Video size={16} /> Calls & Media
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "security" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <Lock size={16} /> Account Security
        </button>
      </div>

      <div className={styles.settingsCard}>
        {message && <div className={styles.successMessage}>{message}</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSave}>
          {/* TAB 1: PROFILE & STATUS */}
          {activeTab === "profile" && (
            <>
              <div className={styles.avatarSection}>
                <UserAvatar src={avatar} name={name} size={100} className={styles.avatarPreview} />
                <div className={styles.avatarActions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    Change Photo
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <span className={styles.avatarHint}>JPG, GIF or PNG. Max size of 2MB.</span>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className="form-label">Division</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input"
                    placeholder="e.g. PMED"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="input"
                    placeholder="e.g. MIS"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className="form-label">Position / Job Title</label>
                  <input
                    type="text"
                    className="input"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Administrative Aide"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className="form-label">Custom Status Message</label>
                  <input
                    type="text"
                    className="input"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    placeholder="e.g. In a meeting 📅"
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Messenger Feature: Active Status Toggle */}
              <h2 className={styles.sectionTitle}><Sparkles size={18} /> Active Status</h2>
              <div className={styles.switchRow}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Show when you're active</span>
                  <span className={styles.switchSub}>
                    Your colleagues will see a green indicator when you're online or recently active.
                  </span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.activeStatus}
                    onChange={(e) => handleUpdateSetting("activeStatus", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </>
          )}

          {/* TAB 2: CHAT & THEME */}
          {activeTab === "chat" && (
            <>
              <h2 className={styles.sectionTitle}><Sun size={18} /> Interface Theme</h2>
              <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                {mounted && (
                  <select
                    className="input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                )}
              </div>

              <h2 className={styles.sectionTitle}><Sparkles size={18} /> Messenger Chat Theme Accent</h2>
              <div className={styles.themeGrid}>
                {[
                  { id: "emerald", name: "DA Emerald", bg: "linear-gradient(135deg, #10b981, #047857)" },
                  { id: "messenger", name: "Meta Blue", bg: "linear-gradient(135deg, #0084ff, #00c6ff)" },
                  { id: "violet", name: "Cyber Violet", bg: "linear-gradient(135deg, #8b5cf6, #ec4899)" },
                  { id: "sunset", name: "Sunset Gold", bg: "linear-gradient(135deg, #f59e0b, #ef4444)" },
                  { id: "midnight", name: "Midnight", bg: "linear-gradient(135deg, #1e293b, #0f172a)" }
                ].map((t) => (
                  <div
                    key={t.id}
                    className={`${styles.themeCard} ${messengerSettings.chatTheme === t.id ? styles.themeCardSelected : ""}`}
                    onClick={() => handleUpdateSetting("chatTheme", t.id)}
                  >
                    <div className={styles.themeBubble} style={{ background: t.bg }}>
                      {messengerSettings.chatTheme === t.id && <Check size={16} color="white" />}
                    </div>
                    <span className={styles.themeName}>{t.name}</span>
                  </div>
                ))}
              </div>

              <h2 className={styles.sectionTitle}><MessageSquare size={18} /> Message Font Size</h2>
              <div className={styles.fontSizeGrid}>
                {[
                  { id: "compact", label: "Compact", size: "13px" },
                  { id: "normal", label: "Normal", size: "15px" },
                  { id: "large", label: "Large", size: "17px" }
                ].map((f) => (
                  <div
                    key={f.id}
                    className={`${styles.fontCard} ${messengerSettings.fontSize === f.id ? styles.fontCardSelected : ""}`}
                    onClick={() => handleUpdateSetting("fontSize", f.id)}
                  >
                    <div style={{ fontSize: f.size, fontWeight: 600, marginBottom: 4 }}>Aa</div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{f.label}</span>
                  </div>
                ))}
              </div>

              <h2 className={styles.sectionTitle}><MessageSquare size={18} /> Chat Input Behavior</h2>
              <div className={styles.switchRow} style={{ marginBottom: 16 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Press Enter to Send</span>
                  <span className={styles.switchSub}>Use Shift + Enter to insert a new line</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.enterToSend}
                    onChange={(e) => handleUpdateSetting("enterToSend", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <h2 className={styles.sectionTitle}>Quick Reaction Bar Emojis</h2>
              <div className={styles.emojiGrid}>
                {messengerSettings.quickEmojis.map((emoji, idx) => (
                  <span key={idx} className={styles.emojiPill}>{emoji}</span>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: NOTIFICATIONS & SOUNDS */}
          {activeTab === "notifications" && (
            <>
              <div className={styles.switchRow} style={{ marginBottom: 12 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>In-App Message Sounds</span>
                  <span className={styles.switchSub}>Play audio chime on incoming messages</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.playSounds}
                    onChange={(e) => handleUpdateSetting("playSounds", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <div className={styles.switchRow} style={{ marginBottom: 12 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Incoming Call Ringtone</span>
                  <span className={styles.switchSub}>Play ringing sound during incoming voice & video calls</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.callRingtone}
                    onChange={(e) => handleUpdateSetting("callRingtone", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <div className={styles.switchRow} style={{ marginBottom: 12 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Desktop Push Notifications</span>
                  <span className={styles.switchSub}>Receive browser alerts when app is in background</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.desktopNotifs}
                    onChange={(e) => handleUpdateSetting("desktopNotifs", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <div className={styles.switchRow} style={{ marginBottom: 24 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Show Message Previews</span>
                  <span className={styles.switchSub}>Include sender name and text snippet in notification alerts</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.showPreview}
                    onChange={(e) => handleUpdateSetting("showPreview", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <h2 className={styles.sectionTitle}><Moon size={18} /> Quiet Hours / Do Not Disturb</h2>
              <div className={styles.switchRow} style={{ marginBottom: 16 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Enable Quiet Hours Schedule</span>
                  <span className={styles.switchSub}>Mute notifications automatically during set hours</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.quietHours.enabled}
                    onChange={(e) => handleUpdateQuietHours("enabled", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              {messengerSettings.quietHours.enabled && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={messengerSettings.quietHours.start}
                      onChange={(e) => handleUpdateQuietHours("start", e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={messengerSettings.quietHours.end}
                      onChange={(e) => handleUpdateQuietHours("end", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 4: PRIVACY & SAFETY */}
          {activeTab === "privacy" && (
            <>
              <h2 className={styles.sectionTitle}><Eye size={18} /> Messenger Privacy Controls</h2>
              
              <div className={styles.switchRow} style={{ marginBottom: 12 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Read Receipts ("Seen")</span>
                  <span className={styles.switchSub}>Let people see when you've read their messages</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.readReceipts}
                    onChange={(e) => handleUpdateSetting("readReceipts", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <div className={styles.switchRow} style={{ marginBottom: 24 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>Typing Indicators</span>
                  <span className={styles.switchSub}>Show when you're typing a reply in chat</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.typingIndicators}
                    onChange={(e) => handleUpdateSetting("typingIndicators", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <h2 className={styles.sectionTitle}>Blocked Accounts</h2>
              <p className={styles.settingsSub} style={{ marginBottom: 16 }}>
                Blocked users cannot send you direct messages or see your active status.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {blockedUserIds.length === 0 ? (
                  <div style={{ padding: 24, background: "var(--bg-input)", borderRadius: 12, textAlign: "center", color: "var(--text-muted)" }}>
                    You haven't blocked anyone.
                  </div>
                ) : (
                  blockedUserIds.map(id => {
                    const bUser = allUsers.find(u => u.id === id);
                    if (!bUser) return null;
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: "var(--bg-input)", borderRadius: 12, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="avatar avatar-md">
                            <UserAvatar src={bUser.avatar} name={bUser.name} size={32} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{bUser.name}</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{bUser.email}</div>
                          </div>
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={() => handleUnblock(id)}>
                          Unblock
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 5: CALLS & MEDIA */}
          {activeTab === "calls" && (
            <>
              <h2 className={styles.sectionTitle}><Mic size={18} /> Audio & Microphone Test</h2>
              <div className={styles.deviceCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isMicTesting ? <Mic size={20} color="#10b981" /> : <MicOff size={20} className="text-muted" />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Default Input Microphone</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>System Default Microphone (Built-in)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn ${isMicTesting ? "btn-danger" : "btn-primary"}`}
                    onClick={toggleMicTest}
                  >
                    {isMicTesting ? "Stop Test" : "Test Mic"}
                  </button>
                </div>

                {isMicTesting && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "var(--text-muted)" }}>
                      <span>Input Level Meter</span>
                      <span>{micLevel}%</span>
                    </div>
                    <div className={styles.meterWrap}>
                      <div className={styles.meterFill} style={{ width: `${micLevel}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}><Sparkles size={18} /> Call Preferences</h2>
              <div className={styles.switchRow} style={{ marginBottom: 12 }}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>AI Noise Suppression</span>
                  <span className={styles.switchSub}>Filter out background noise during voice & video calls</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.noiseSuppression}
                    onChange={(e) => handleUpdateSetting("noiseSuppression", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>

              <div className={styles.switchRow}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>HD Video Quality</span>
                  <span className={styles.switchSub}>Stream high definition video when network permits</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={messengerSettings.hdVideo}
                    onChange={(e) => handleUpdateSetting("hdVideo", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </>
          )}

          {/* TAB 6: ACCOUNT SECURITY */}
          {activeTab === "security" && (
            <>
              <h2 className={styles.sectionTitle}><Lock size={18} /> Change Password</h2>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>

              <h2 className={styles.sectionTitle}><Monitor size={18} /> Active Sessions</h2>
              <div className={styles.sessionCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Monitor size={24} style={{ color: "var(--brand)" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                      Windows PC · Google Chrome <span style={{ fontSize: 11, padding: "2px 6px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 100, marginLeft: 6 }}>Current Session</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Calabarzon, Philippines · Active Now
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={styles.actionRow}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
