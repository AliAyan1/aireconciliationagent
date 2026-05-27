/**
 * Subtle UI sounds via Web Audio API (no audio files or libraries).
 * Mute preference: localStorage key `hisaabai-sounds-muted` === "1"
 */

const MUTE_KEY = "hisaabai-sounds-muted";

let audioCtx: AudioContext | null = null;
let lastDingAt = 0;
const muteListeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let mutedCache = readMuted();

export function isSoundsMuted(): boolean {
  return mutedCache;
}

export function setSoundsMuted(muted: boolean): void {
  mutedCache = muted;
  if (typeof window !== "undefined") {
    try {
      if (muted) localStorage.setItem(MUTE_KEY, "1");
      else localStorage.removeItem(MUTE_KEY);
    } catch {
      // ignore
    }
  }
  muteListeners.forEach((cb) => cb(muted));
}

export function toggleSoundsMuted(): boolean {
  setSoundsMuted(!isSoundsMuted());
  return isSoundsMuted();
}

export function subscribeSoundMute(
  listener: (muted: boolean) => void
): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

export function getSoundMuteSnapshot(): boolean {
  return isSoundsMuted();
}

/** Call from a user gesture so AudioContext can start (browser policy). */
export function ensureAudioContext(): void {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
}

function getCtx(): AudioContext | null {
  if (isSoundsMuted()) return null;
  ensureAudioContext();
  return audioCtx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Soft ding when a match is approved */
export function playApproveDing(): void {
  const now = Date.now();
  if (now - lastDingAt < 220) return;
  lastDingAt = now;

  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  tone(ctx, 880, t, 0.22, 0.11);
  tone(ctx, 1174.66, t + 0.06, 0.28, 0.07);
}

/** Gentle whoosh when entries are posted */
export function playPostWhoosh(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  const duration = 0.38;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(900, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.14, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(t);
  source.stop(t + duration + 0.05);
}

/** Short celebration arpeggio on 100% match */
export function playPerfectMatchCelebration(): void {
  if (prefersReducedMotion()) return;

  const ctx = getCtx();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  const t = ctx.currentTime;
  notes.forEach((freq, i) => {
    tone(ctx, freq, t + i * 0.09, 0.35, 0.1 - i * 0.012);
  });
  tone(ctx, 1318.51, t + 0.38, 0.45, 0.08);
}
