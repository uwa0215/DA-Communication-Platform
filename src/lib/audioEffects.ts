let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Auto-resume AudioContext on user interaction to ensure sounds play seamlessly
if (typeof window !== "undefined") {
  const resumeAudioOnInteraction = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener("click", resumeAudioOnInteraction, { passive: true });
  window.addEventListener("keydown", resumeAudioOnInteraction, { passive: true });
}

/**
 * Authentic Meta Messenger Incoming Message Chime
 * Synthesizes Meta Messenger's signature 2-tone melodic chime: Note 1 (C6 - 1046.5Hz) followed by Note 2 (E6 - 1318.5Hz) with a crystal harmonic (G6 - 1568Hz).
 */
export function playMessengerIncomingSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.connect(ctx.destination);

    // Tone 1: High crisp pop (C6 - 1046.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: Bright chime pop (E6 - 1318.5 Hz) starting 70ms after Tone 1
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.07);
    gain2.gain.setValueAtTime(0.4, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.38);

    // Resonance harmonic (G6 - 1567.98 Hz) for Messenger crystal tone
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1567.98, now + 0.07);
    gain3.gain.setValueAtTime(0.15, now + 0.07);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(now + 0.07);
    osc3.stop(now + 0.28);
  } catch (e) {
    console.error("Failed to play Messenger incoming sound", e);
  }
}

/**
 * Authentic Meta Messenger Outgoing Message Sound
 * Synthesizes Meta Messenger's signature subtle outgoing pop sound when sending a message.
 */
export function playMessengerOutgoingSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) {
    console.error("Failed to play Messenger outgoing sound", e);
  }
}

// Alias for backwards compatibility
export function playMessageChime() {
  playMessengerIncomingSound();
}

export function playCallRingtone() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.15);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error("Failed to play ringtone", e);
  }
}
