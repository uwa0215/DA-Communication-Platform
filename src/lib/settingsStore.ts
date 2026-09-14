"use client";

export interface ChatSettings {
  chatTheme: string; // 'emerald' | 'messenger' | 'violet' | 'sunset' | 'cyberpunk'
  fontSize: string; // 'compact' | 'normal' | 'large'
  playSounds: boolean;
  callRingtone: boolean;
  desktopNotifs: boolean;
  showPreview: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  enterToSend: boolean;
  activeStatus: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  quickEmojis: string[];
  noiseSuppression: boolean;
  hdVideo: boolean;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  chatTheme: "emerald",
  fontSize: "normal",
  playSounds: true,
  callRingtone: true,
  desktopNotifs: true,
  showPreview: true,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
  enterToSend: true,
  activeStatus: true,
  readReceipts: true,
  typingIndicators: true,
  quickEmojis: ["👍", "❤️", "😂", "😮", "😢", "🙏"],
  noiseSuppression: true,
  hdVideo: true,
};

const STORAGE_KEY = "trellis_messenger_settings";

export function loadSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<ChatSettings>): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const current = loadSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("trellis_settings_updated", { detail: updated }));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
  return updated;
}
