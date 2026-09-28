"use client";

import { useEffect, useRef } from "react";

export type SarVariant = "sts" | "single" | "cluster" | "spoof";

function colorAt(value: number): [number, number, number] {
  const stops: [number, number, number, number][] = [
    [0, 4, 8, 16],
    [0.18, 8, 28, 62],
    [0.4, 18, 92, 128],
    [0.62, 232, 176, 42],
    [0.8, 255, 70, 78],
    [1, 255, 248, 240],
  ];
  let index = 0;
  while (index < stops.length - 2 && value > stops[index + 1][0]) index += 1;
  const a = stops[index];
  const b = stops[index + 1];
  const t = (value - a[0]) / (b[0] - a[0] || 1);
  return [
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

function hull(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, beam: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, length, beam, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function SarCrop({
  variant = "single",
  backscatter = 14.8,
  coordinate = "24°18'N 58°31'E",
  animate = true,
  className = "",
}: {
  variant?: SarVariant;
  backscatter?: number;
  coordinate?: string;
  animate?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 640;
    const height = 420;
    canvas.width = width;
    canvas.height = height;

    const base = document.createElement("canvas");
    base.width = width;
    base.height = height;
    const baseCtx = base.getContext("2d");
    if (!baseCtx) return;
    const image = baseCtx.createImageData(width, height);
    const data = image.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const n =
          Math.abs(Math.sin(x * 0.17) * Math.cos(y * 0.13)) * 0.18 +
          ((Math.sin(x * 12.2 + y * 9.1) * 0.5 + 0.5) * 0.22);
        const i = (y * width + x) * 4;
        const [r, g, b] = colorAt(n * 0.55);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    baseCtx.putImageData(image, 0, 0);

    let frame = 0;
    const render = (time: number) => {
      ctx.drawImage(base, 0, 0);

      const scan = animate ? (time / 28) % height : height * 0.42;
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, scan, width, 2);

      ctx.fillStyle = "rgba(255, 236, 210, 0.92)";
      if (variant === "sts") {
        hull(ctx, 250, 210, 78, 16, -0.35);
        hull(ctx, 390, 228, 84, 18, -0.33);
      } else if (variant === "cluster") {
        const spots = [
          [180, 150],
          [250, 190],
          [310, 160],
          [360, 230],
          [220, 250],
          [300, 280],
        ];
        for (const [x, y] of spots) hull(ctx, x, y, 22, 8, 0.4);
      } else if (variant === "spoof") {
        hull(ctx, 420, 240, 62, 15, 0.5);
        ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(160, 120, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText("FALSE AIS", 124, 96);
      } else {
        hull(ctx, 330, 214, 86, 18, -0.2);
      }

      ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(24, 24, width - 48, height - 48);
      ctx.font = "13px ui-monospace, monospace";
      ctx.fillStyle = "#E9FBFF";
      ctx.fillText(`σ0  ${backscatter.toFixed(1)} dB`, 36, 48);
      ctx.fillText(coordinate, 36, height - 36);
      ctx.fillText(variant === "sts" ? "DUAL HULL" : "SAR CROP", width - 150, 48);

      const legendX = width - 36;
      for (let i = 0; i < 120; i++) {
        const [r, g, b] = colorAt(i / 120);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(legendX, 70 + i, 10, 1);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillText("dB", legendX - 28, 66);
    };

    if (!animate) {
      render(900);
      return;
    }
    const loop = (now: number) => {
      render(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [animate, backscatter, coordinate, variant]);

  return <canvas ref={canvasRef} className={`h-auto w-full rounded-xl ${className}`} />;
}
