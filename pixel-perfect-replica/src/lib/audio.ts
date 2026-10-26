// Soft sounds generated with the Web Audio API, plus speech helpers.
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.12, slideTo?: number) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  chime(delaySec = 0, step = 0) {
    tone(880 + step * 110, delaySec, 0.35, "sine", 0.08);
    tone(1320 + step * 110, delaySec + 0.02, 0.3, "triangle", 0.03);
  },
  sparkle(delaySec = 0) {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, delaySec + i * 0.08, 0.4, "triangle", 0.07));
  },
  boing(delaySec = 0) {
    tone(320, delaySec, 0.35, "sine", 0.12, 140);
  },
  pop() {
    tone(600, 0, 0.08, "sine", 0.08, 900);
  },
  cheer(delaySec = 0) {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, delaySec + i * 0.1, 0.3, "square", 0.03));
  },
};

/** Speak text. Returns false when no matching voice is available (caller shows text instead). */
export function speak(text: string, lang: string): boolean {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const prefix = lang.slice(0, 2);
    const voice =
      voices.find((v) => v.lang.replace("_", "-") === lang) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (!voice) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1.1;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function primeVoices() {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
}
