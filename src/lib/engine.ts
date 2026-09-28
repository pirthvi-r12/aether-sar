import { sonarPing } from "@/lib/audio";
import type { MapView, OrbState, QueueFilter } from "@/lib/types";

export interface EngineSnapshot {
  hoursAgo: number;
  playing: boolean;
  selectedId: string | null;
  orb: OrbState;
  ticker: string;
  filter: QueueFilter;
  notice: string | null;
  retaskId: string | null;
  demo: string | null;
}

export class SimEngine {
  hoursAgo = 0;
  playing = false;
  playRate = 3.2;
  playUntil: number | null = null;
  view: MapView = { lng: 48, lat: 16, scale: 240 };
  viewReady = false;
  selectedId: string | null = null;
  orb: OrbState = "idle";
  ticker = "Scanning maritime corridors. Sentinel constellation nominal.";
  filter: QueueFilter = "all";
  notice: string | null = null;
  retaskId: string | null = null;
  demo: string | null = null;
  fly: { from: MapView; to: MapView; t0: number; dur: number } | null = null;
  lastNow = 0;
  lastUi = 0;
  cancelDemo: (() => void) | null = null;

  private listeners = new Set<() => void>();
  private snapshot: EngineSnapshot;

  constructor() {
    this.snapshot = this.capture();
  }

  private capture(): EngineSnapshot {
    return {
      hoursAgo: this.hoursAgo,
      playing: this.playing,
      selectedId: this.selectedId,
      orb: this.orb,
      ticker: this.ticker,
      filter: this.filter,
      notice: this.notice,
      retaskId: this.retaskId,
      demo: this.demo,
    };
  }

  getSnapshot = (): EngineSnapshot => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  emit(): void {
    this.snapshot = this.capture();
    this.listeners.forEach((listener) => listener());
  }

  setHours(hours: number, keepPlaying = false): void {
    this.hoursAgo = Math.max(0, Math.min(72, hours));
    if (!keepPlaying) {
      this.playing = false;
      this.playUntil = null;
    }
    this.emit();
  }

  togglePlay(): void {
    if (!this.playing && this.hoursAgo <= 0.08) this.hoursAgo = 72;
    this.playing = !this.playing;
    this.playUntil = this.playing ? 0 : null;
    this.emit();
  }

  playToward(hours: number): void {
    this.playUntil = hours;
    this.playing = this.hoursAgo > hours + 0.05;
    this.emit();
  }

  flyTo(view: MapView): void {
    this.viewReady = true;
    this.fly = {
      from: { ...this.view },
      to: view,
      t0: typeof performance !== "undefined" ? performance.now() : 0,
      dur: 1600,
    };
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.retaskId = null;
    this.emit();
  }

  setFilter(filter: QueueFilter): void {
    this.filter = filter;
    this.emit();
  }

  setOrb(orb: OrbState, ticker: string): void {
    const previous = this.orb;
    this.orb = orb;
    this.ticker = ticker;
    if (previous !== orb && orb === "locked") sonarPing(168, 0.42, 0.08);
    else if (previous === "idle" && orb === "correlating") sonarPing(520, 0.12, 0.045);
    this.emit();
  }

  setNotice(notice: string | null): void {
    this.notice = notice;
    this.emit();
  }

  retask(): void {
    if (!this.selectedId) return;
    this.retaskId = this.selectedId;
    this.notice = "RETASK QUEUED // Sentinel-1A next pass in 00:41:12";
    sonarPing(430, 0.16, 0.05);
    this.emit();
  }

  clearDemo(): void {
    this.cancelDemo?.();
    this.cancelDemo = null;
  }
}

export function tickEngine(engine: SimEngine, now: number): void {
  if (!engine.lastNow) engine.lastNow = now;
  const dt = Math.min(0.05, (now - engine.lastNow) / 1000);
  engine.lastNow = now;
  if (typeof document !== "undefined" && document.hidden) return;

  if (engine.fly) {
    const t = Math.min(1, (now - engine.fly.t0) / engine.fly.dur);
    const eased = 1 - (1 - t) ** 3;
    engine.view = {
      lng: engine.fly.from.lng + (engine.fly.to.lng - engine.fly.from.lng) * eased,
      lat: engine.fly.from.lat + (engine.fly.to.lat - engine.fly.from.lat) * eased,
      scale: engine.fly.from.scale + (engine.fly.to.scale - engine.fly.from.scale) * eased,
    };
    if (t >= 1) engine.fly = null;
  }

  if (!engine.playing) return;
  engine.hoursAgo = Math.max(0, engine.hoursAgo - dt * engine.playRate);
  if (engine.playUntil != null && engine.hoursAgo <= engine.playUntil) {
    engine.hoursAgo = engine.playUntil;
    engine.playing = false;
    engine.playUntil = null;
  }
  if (engine.hoursAgo <= 0) engine.playing = false;
  if (now - engine.lastUi > 120) {
    engine.lastUi = now;
    engine.emit();
  }
}
