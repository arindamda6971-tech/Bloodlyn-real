import { Capacitor } from "@capacitor/core";
import { Haptics } from "@capacitor/haptics";

/**
 * BloodLyn's own ringtone for doctor calls, synthesised with Web Audio so there is no
 * sound file to ship: a soft rising three-note phrase, twice, then a pause, repeated
 * until stopRingtone(). The phone also vibrates with each phrase.
 */
const PHRASE = [659.25, 830.61, 987.77]; // E5, G#5, B5
const NOTE = 0.16;
const CYCLE_MS = 2600;

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function audioContext(): AudioContext | null {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

// Browsers only let a page make sound after the person has touched it once, so the
// audio is unlocked on the first tap anywhere in the app.
if (typeof window !== "undefined") {
  const unlock = () => {
    audioContext()?.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
}

function playPhrase(ac: AudioContext) {
  const start = ac.currentTime + 0.02;
  [0, 0.62].forEach((offset) => {
    PHRASE.forEach((freq, i) => {
      const t = start + offset + i * NOTE;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + NOTE + 0.12);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + NOTE + 0.15);
    });
  });
}

function vibrate() {
  if (Capacitor.isNativePlatform()) {
    Haptics.vibrate({ duration: 700 }).catch(() => {});
  } else {
    try { navigator.vibrate?.([400, 200, 400]); } catch { /* not supported */ }
  }
}

export function startRingtone() {
  if (timer) return;
  const ring = () => {
    const ac = audioContext();
    if (ac) {
      ac.resume().catch(() => {});
      try { playPhrase(ac); } catch { /* sound blocked until the first tap */ }
    }
    vibrate();
  };
  ring();
  timer = setInterval(ring, CYCLE_MS);
}

export function stopRingtone() {
  if (timer) clearInterval(timer);
  timer = null;
  try { navigator.vibrate?.(0); } catch { /* not supported */ }
}
