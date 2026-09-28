"use client";

import { useEffect, useRef, useState } from "react";
import { geoGraticule, geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { ALL_TRACKED, HEXES, INCIDENTS, LANES, TRAFFIC, incidentForVessel } from "@/lib/data";
import { tickEngine, type SimEngine } from "@/lib/engine";
import { formatCoord } from "@/lib/format";
import { useEngine } from "@/components/console/engine-context";
import { aisLive, radarLive, sampleTrack, spoofPoint, trackHeading, trafficPose } from "@/lib/simulation";
import { countryFeature, landFeature } from "@/lib/world";
import type { MapView } from "@/lib/types";

function projectOf(width: number, height: number, view: MapView): GeoProjection {
  return geoMercator().center([view.lng, view.lat]).scale(view.scale).translate([width / 2, height / 2]);
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  color: string,
  glow: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((heading * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(5, 7);
  ctx.lineTo(0, 3.5);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function TacticalMap() {
  const engine = useEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; lng: number; lat: number; scale: number; moved: boolean } | null>(null);
  const [readout, setReadout] = useState("AWAITING CURSOR");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let lastRead = 0;
    const grat = geoGraticule().step([10, 10])();

    const render = (now: number) => {
      tickEngine(engine, now);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (!engine.viewReady) {
        engine.view.scale = width / 6.5;
        engine.viewReady = true;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const pixelW = Math.floor(width * dpr);
      const pixelH = Math.floor(height * dpr);
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const view = engine.view;
      const projection = projectOf(width, height, view);
      const path = geoPath(projection, ctx);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#061018";
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      path(grat as never);
      ctx.strokeStyle = "rgba(0, 240, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const hexR = Math.min(16, Math.max(3.2, view.scale * 0.0036));
      for (const hex of HEXES) {
        const point = projection([hex.lng, hex.lat]);
        if (!point) continue;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const x = point[0] + Math.cos(angle) * hexR;
          const y = point[1] + Math.sin(angle) * hexR;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 240, 255, ${0.025 + hex.weight * 0.16})`;
        ctx.fill();
      }

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.16)";
      for (const lane of LANES) {
        ctx.beginPath();
        let open = false;
        lane.points.forEach((point, index) => {
          const prev = lane.points[index - 1];
          const projected = projection([point.lng, point.lat]);
          if (!projected) return;
          if (!open || (prev && Math.abs(prev.lng - point.lng) > 40)) {
            ctx.moveTo(projected[0], projected[1]);
            open = true;
          } else ctx.lineTo(projected[0], projected[1]);
        });
        ctx.stroke();
      }

      ctx.beginPath();
      path(landFeature as never);
      ctx.fillStyle = "#102033";
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(130, 244, 255, 0.72)";
      ctx.stroke();

      if (view.scale > 900) {
        ctx.beginPath();
        path(countryFeature as never);
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(0, 240, 255, 0.22)";
        ctx.stroke();
      }

      for (const incident of INCIDENTS) {
        if (!incident.reserve) continue;
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const angle = (i / 48) * Math.PI * 2;
          const lng = incident.reserve.lng + Math.cos(angle) * incident.reserve.rLng;
          const lat = incident.reserve.lat + Math.sin(angle) * incident.reserve.rLat;
          const point = projection([lng, lat]);
          if (!point) continue;
          if (i === 0) ctx.moveTo(point[0], point[1]);
          else ctx.lineTo(point[0], point[1]);
        }
        ctx.closePath();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = "rgba(0, 255, 136, 0.8)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const incident of INCIDENTS) {
        if (!incident.swath || incident.swathHoursAgo == null) continue;
        if (engine.hoursAgo > incident.swathHoursAgo + 0.2) continue;
        const age = incident.swathHoursAgo - engine.hoursAgo;
        ctx.beginPath();
        incident.swath.forEach((coord, index) => {
          const point = projection(coord);
          if (!point) return;
          if (index === 0) ctx.moveTo(point[0], point[1]);
          else ctx.lineTo(point[0], point[1]);
        });
        ctx.closePath();
        ctx.fillStyle = age < 0.55 ? "rgba(0, 255, 136, 0.22)" : "rgba(0, 255, 136, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 255, 136, 0.85)";
        ctx.stroke();
      }

      for (const vessel of TRAFFIC) {
        const pose = trafficPose(vessel, engine.hoursAgo);
        const point = projection([pose.lng, pose.lat]);
        if (!point) continue;
        drawShip(ctx, point[0], point[1], pose.heading, "rgba(0, 240, 255, 0.78)", false);
      }

      const selected = engine.selectedId;
      const related = new Set<string>();
      if (selected) {
        const incident = incidentForVessel(selected);
        if (incident) {
          related.add(incident.vesselId);
          incident.relatedVesselIds.forEach((id) => related.add(id));
        } else related.add(selected);
      }

      for (const vessel of ALL_TRACKED) {
        const pose = sampleTrack(vessel.track, engine.hoursAgo);
        const point = projection([pose.lng, pose.lat]);
        if (!point) continue;
        const heading = trackHeading(vessel.track, engine.hoursAgo);
        const liveAis = aisLive(vessel, engine.hoursAgo);
        const caught = radarLive(vessel, engine.hoursAgo);
        const hot = related.has(vessel.id);

        if (vessel.spoof) {
          const fake = spoofPoint(vessel, engine.hoursAgo);
          const fakePoint = projection([fake.lng, fake.lat]);
          if (fakePoint) {
            drawShip(ctx, fakePoint[0], fakePoint[1], (now / 40) % 360, "#00F0FF", true);
            if (caught) {
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(fakePoint[0], fakePoint[1]);
              ctx.lineTo(point[0], point[1]);
              ctx.strokeStyle = "rgba(255, 42, 66, 0.9)";
              ctx.lineWidth = 1.3;
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }

        if (!vessel.spoof && liveAis) {
          drawShip(ctx, point[0], point[1], heading, "#00F0FF", hot);
        } else if (!vessel.spoof && !caught) {
          ctx.save();
          ctx.translate(point[0], point[1]);
          ctx.rotate((heading * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(22, -70);
          ctx.lineTo(-22, -70);
          ctx.closePath();
          ctx.fillStyle = "rgba(255, 184, 0, 0.16)";
          ctx.strokeStyle = "rgba(255, 184, 0, 0.75)";
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          drawShip(ctx, point[0], point[1], heading, "#FFB800", hot);
        }

        if (caught) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 180);
          ctx.beginPath();
          ctx.arc(point[0], point[1], 8 + pulse * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 42, 66, ${0.35 + pulse * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (vessel.spoof || !liveAis) drawShip(ctx, point[0], point[1], heading, "#FF2A42", true);
        }

        if (hot || view.scale > 2400) {
          ctx.font = "11px ui-monospace, monospace";
          const text = vessel.name;
          const box = ctx.measureText(text).width;
          ctx.fillStyle = "rgba(4, 8, 14, 0.82)";
          ctx.fillRect(point[0] + 10, point[1] - 18, box + 10, 16);
          ctx.fillStyle = hot ? "#ffffff" : "rgba(255,255,255,0.8)";
          ctx.fillText(text, point[0] + 15, point[1] - 6);
        }

        if (hot) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 16, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(4,6,10,0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      if (now - lastRead > 180) {
        lastRead = now;
        setZoom(view.scale);
        const hover = (canvas as HTMLCanvasElement & { _hover?: { x: number; y: number } })._hover;
        if (hover) {
          const coord = projection.invert?.([hover.x, hover.y]);
          if (coord) setReadout(formatCoord(coord[1], coord[0]));
        }
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0011);
      engine.view.scale = Math.max(120, Math.min(12000, engine.view.scale * factor));
      engine.fly = null;
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [engine]);

  const hitTest = (x: number, y: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const projection = projectOf(canvas.clientWidth, canvas.clientHeight, engine.view);
    let best: { id: string; d: number } | null = null;
    const consider = (id: string, lng: number, lat: number, limit: number) => {
      const point = projection([lng, lat]);
      if (!point) return;
      const d = Math.hypot(point[0] - x, point[1] - y);
      if (d < limit && (!best || d < best.d)) best = { id, d };
    };
    for (const vessel of ALL_TRACKED) {
      const pose = sampleTrack(vessel.track, engine.hoursAgo);
      consider(vessel.id, pose.lng, pose.lat, 16);
      if (vessel.spoof) {
        const fake = spoofPoint(vessel, engine.hoursAgo);
        consider(vessel.id, fake.lng, fake.lat, 16);
      }
    }
    if (best) return (best as { id: string }).id;
    for (const vessel of TRAFFIC) {
      const pose = trafficPose(vessel, engine.hoursAgo);
      consider(vessel.id, pose.lng, pose.lat, 10);
    }
    return best ? (best as { id: string }).id : null;
  };

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            lng: engine.view.lng,
            lat: engine.view.lat,
            scale: engine.view.scale,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          void rect;
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          (event.currentTarget as HTMLCanvasElement & { _hover?: { x: number; y: number } })._hover = hover;
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          if (Math.hypot(dx, dy) > 4) drag.current.moved = true;
          const projection = projectOf(rect.width, rect.height, {
            lng: drag.current.lng,
            lat: drag.current.lat,
            scale: drag.current.scale,
          });
          const origin = projection.invert?.([rect.width / 2, rect.height / 2]);
          const shifted = projection.invert?.([rect.width / 2 - dx, rect.height / 2 - dy]);
          if (!origin || !shifted) return;
          engine.view.lng = drag.current.lng + (shifted[0] - origin[0]);
          engine.view.lat = Math.max(-72, Math.min(78, drag.current.lat + (shifted[1] - origin[1])));
          engine.fly = null;
        }}
        onPointerUp={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const moved = drag.current?.moved;
          drag.current = null;
          if (moved) return;
          const id = hitTest(event.clientX - rect.left, event.clientY - rect.top);
          if (!id) {
            engine.setSelected(null);
            engine.setOrb("idle", "Scanning maritime corridors. Sentinel constellation nominal.");
            return;
          }
          engine.setSelected(id);
          const incident = incidentForVessel(id);
          if (incident) {
            engine.flyTo(incident.region);
            engine.setOrb(
              incident.severity === "critical" ? "locked" : "correlating",
              incident.severity === "critical"
                ? "Dark Tanker Anomaly Confirmed // Radar Return 14.8 dB"
                : "Correlating SAR pass against AIS transponder logs..."
            );
          } else {
            engine.setOrb("idle", "Clean AIS track. No unmatched SAR return inside 25 nm.");
          }
        }}
        onDoubleClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          engine.fly = null;
          engine.view = { lng: 48, lat: 16, scale: canvas.clientWidth / 6.5 };
        }}
      />
      <div className="pointer-events-none absolute left-3 top-3 hidden rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-white/70 lg:left-[360px] lg:block">
        {readout} // Z {Math.round(zoom)}
      </div>
      <div className="pointer-events-none absolute bottom-24 right-3 hidden flex-col gap-1 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 font-mono text-[10px] text-white/75 lg:flex">
        <span className="text-aether-cyan">CYAN // LIVE AIS</span>
        <span className="text-aether-amber">AMBER // DEAD RECKONING</span>
        <span className="text-aether-red">RED // SAR HULL, NO AIS</span>
        <span className="text-aether-emerald">EMERALD // SAR SWATH</span>
      </div>
      <div className="absolute bottom-24 left-3 z-20 flex flex-col gap-2 lg:left-[360px]">
        <button type="button" className="glass h-8 w-8 rounded-lg" onClick={() => { engine.view.scale = Math.min(12000, engine.view.scale * 1.3); engine.fly = null; }}>+</button>
        <button type="button" className="glass h-8 w-8 rounded-lg" onClick={() => { engine.view.scale = Math.max(120, engine.view.scale / 1.3); engine.fly = null; }}>−</button>
      </div>
    </div>
  );
}

export type { SimEngine };
