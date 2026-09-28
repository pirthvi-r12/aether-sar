let context: AudioContext | null = null;
let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("aether-muted", next ? "1" : "0");
  }
}

export function hydrateMute(): boolean {
  if (typeof window === "undefined") return muted;
  muted = window.localStorage.getItem("aether-muted") === "1";
  return muted;
}

export function armAudio(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!context) context = new Ctx();
  if (context.state === "suspended") void context.resume();
}

export function sonarPing(freq = 640, duration = 0.16, gain = 0.07): void {
  if (muted || !context) return;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const amp = context.createGain();
  const filter = context.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), now + duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, now);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(context.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}
