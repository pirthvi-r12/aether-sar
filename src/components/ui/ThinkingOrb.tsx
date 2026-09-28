"use client";

import { useEffect, useRef } from "react";
import type { OrbState } from "@/lib/types";

const PALETTE: Record<OrbState, { core: string; hot: string; deep: string; ring: string }> = {
  idle: { core: "#00F0FF", hot: "#F3FEFF", deep: "#06343C", ring: "#00F0FF" },
  correlating: { core: "#FFB800", hot: "#FFF1C4", deep: "#3A2804", ring: "#FFB800" },
  locked: { core: "#FF2A42", hot: "#FFE1E6", deep: "#3C0812", ring: "#FF2A42" },
};

const COPY: Record<OrbState, string> = {
  idle: "Wide-area maritime scan. Constellation nominal.",
  correlating: "Correlating Sentinel-1 C-Band pass against AIS transponder logs...",
  locked: "Dark Tanker Anomaly Confirmed // Radar Return 14.8 dB",
};

function hexAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const value = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function jaggedArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  color: string,
  alpha: number
) {
  const steps = 7;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = a0 + (a1 - a0) * t;
    const wobble = i === 0 || i === steps ? 0 : (Math.sin(i * 12.3 + a0 * 4) * 0.16);
    const r = radius * (0.72 + wobble);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.72;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = hexAlpha(color, alpha);
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, time: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.35);
  ctx.strokeStyle = "rgba(255, 42, 66, 0.9)";
  ctx.lineWidth = 1.5;
  const gap = radius * 0.18;
  const arm = radius * 0.34;
  for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * gap, Math.sin(angle) * gap);
    ctx.lineTo(Math.cos(angle) * arm, Math.sin(angle) * arm);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.46, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.stroke();
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, size: number, time: number, state: OrbState) {
  const palette = PALETTE[state];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.27;
  const bpm = state === "idle" ? 60 : state === "correlating" ? 112 : 168;
  const pulse = 0.5 + 0.5 * Math.sin(time * (bpm / 60) * Math.PI * 2);

  ctx.clearRect(0, 0, size, size);

  const bloom = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * (2.15 + pulse * 0.25));
  bloom.addColorStop(0, hexAlpha(palette.core, 0.38));
  bloom.addColorStop(0.42, hexAlpha(palette.core, 0.08));
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, size, size);

  if (state === "locked") {
    for (let i = 0; i < 3; i++) {
      const p = (time / 1.55 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (1.05 + p * 1.7), 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(palette.hot, (1 - p) * 0.55);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  const rings = state === "idle" ? 3 : 4;
  const spin = state === "idle" ? 1 : state === "correlating" ? 2.5 : 3.8;
  for (let i = 0; i < rings; i++) {
    const rot = time * (0.22 + i * 0.13) * spin * (i % 2 === 0 ? 1 : -1);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(1, 0.36 + i * 0.07);
    const ringR = radius * (1.18 + i * 0.24);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(palette.ring, 0.4 - i * 0.06);
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ringR, 0, i === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
    ctx.fillStyle = palette.hot;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * (state === "idle" ? 0.12 : 0.7));
  const rays = state === "locked" ? 22 : 12;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const len = radius * (0.75 + 0.28 * Math.sin(time * 2.2 + i));
    const gradient = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
    gradient.addColorStop(0, hexAlpha(palette.core, 0));
    gradient.addColorStop(0.45, hexAlpha(palette.core, state === "locked" ? 0.7 : 0.28));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = state === "locked" ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();

  const wobble = state === "idle" ? Math.sin(time * 1.6) * 0.015 : Math.sin(time * (state === "locked" ? 16 : 10)) * 0.05;
  const coreR = radius * (1 + pulse * 0.045 + wobble);
  const core = ctx.createRadialGradient(cx - coreR * 0.28, cy - coreR * 0.32, coreR * 0.05, cx, cy, coreR);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.16, palette.hot);
  core.addColorStop(0.48, palette.core);
  core.addColorStop(0.8, palette.deep);
  core.addColorStop(1, hexAlpha(palette.deep, 0.15));
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.sin(time * 1.4 + i) * coreR * 0.18,
      cy + Math.cos(time + i * 1.7) * coreR * 0.12,
      coreR * (0.62 - i * 0.1),
      coreR * 0.11,
      time * (0.35 + i * 0.12),
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.stroke();
  }
  ctx.restore();

  const spec = ctx.createRadialGradient(cx - coreR * 0.32, cy - coreR * 0.38, 0, cx, cy, coreR);
  spec.addColorStop(0, "rgba(255,255,255,0.8)");
  spec.addColorStop(0.28, "rgba(255,255,255,0.05)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  const count = state === "idle" ? 36 : state === "correlating" ? 72 : 100;
  for (let i = 0; i < count; i++) {
    const speed = (0.18 + (i % 7) * 0.07) * (state === "idle" ? 1 : 2.3);
    const angle = time * speed + i * 2.399;
    const jitter = state === "idle" ? 0 : Math.sin(time * 9 + i) * 5;
    const rad = radius * (0.42 + (i % 10) * 0.075) + jitter;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad * (0.5 + (i % 3) * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, i % 6 === 0 ? 2 : 1.05, 0, Math.PI * 2);
    ctx.fillStyle = hexAlpha(i % 5 === 0 ? "#ffffff" : palette.core, 0.45);
    ctx.fill();
  }

  if (state !== "idle") {
    const arcs = state === "locked" ? 6 : 4;
    for (let i = 0; i < arcs; i++) {
      const a1 = time * 2.8 + i * 1.3;
      const a2 = a1 + 0.9 + Math.sin(time * 4 + i);
      jaggedArc(ctx, cx, cy, radius, a1, a2, palette.hot, state === "locked" ? 0.95 : 0.7);
    }
  }

  if (state === "locked") drawCrosshair(ctx, cx, cy, radius * 1.85, time);
}

export function ThinkingOrb({
  state = "idle",
  size = 220,
  showLabel = true,
  label,
  className = "",
}: {
  state?: OrbState;
  size?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const caption = label ?? COPY[state];
  const glow = state === "locked" ? "#FF2A42" : state === "correlating" ? "#FFB800" : "#00F0FF";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frame = 0;
    const started = performance.now();
    const loop = (now: number) => {
      const time = reduce ? 0.8 : (now - started) / 1000;
      paint(ctx, size, time, stateRef.current);
      if (!reduce) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    if (reduce) paint(ctx, size, 0.8, stateRef.current);
    return () => cancelAnimationFrame(frame);
  }, [size]);

  return (
    <div className={`relative ${className}`} style={{ width: size }}>
      <div
        className="pointer-events-none absolute inset-[12%] rounded-full blur-3xl transition-colors duration-700"
        style={{ background: glow, opacity: 0.45 }}
      />
      <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden />
      {showLabel && (
        <p className="relative z-10 mx-auto mt-1 max-w-[280px] text-center font-mono text-[11px] leading-relaxed text-white/80">
          {caption}
        </p>
      )}
    </div>
  );
}
