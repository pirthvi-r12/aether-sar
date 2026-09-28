"use client";

import { Pause, Play } from "lucide-react";
import { incidentForVessel } from "@/lib/data";
import { formatHours } from "@/lib/format";
import { useEngine, useEngineSnapshot } from "@/components/console/engine-context";

export function TimelineBar() {
  const engine = useEngine();
  const snap = useEngineSnapshot();
  const incident = snap.selectedId ? incidentForVessel(snap.selectedId) : undefined;
  const marks = incident?.timeline ?? [
    { hoursAgo: 48, label: "AIS" },
    { hoursAgo: 14, label: "DARK" },
    { hoursAgo: 6, label: "SAR" },
  ];

  return (
    <footer className="relative z-30 flex h-[92px] items-center gap-4 border-t border-white/10 bg-[#070b13]/90 px-4 backdrop-blur-xl">
      <button
        type="button"
        aria-label={snap.playing ? "Pause scrubber" : "Play scrubber"}
        onClick={() => engine.togglePlay()}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-aether-cyan text-[#041014]"
      >
        {snap.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-white/50">
          <span>72-HOUR RADAR SCRUB</span>
          <span className="text-aether-cyan">{formatHours(snap.hoursAgo)}</span>
        </div>
        <div className="relative">
          <input
            className="scrub"
            type="range"
            min={0}
            max={72}
            step={0.1}
            value={72 - snap.hoursAgo}
            onChange={(event) => engine.setHours(72 - Number(event.target.value))}
          />
          <div className="pointer-events-none absolute inset-x-0 top-3">
            {marks.map((mark) => (
              <span
                key={mark.label}
                className="absolute -translate-x-1/2 font-mono text-[9px] text-aether-amber"
                style={{ left: `${((72 - mark.hoursAgo) / 72) * 100}%` }}
              >
                {mark.hoursAgo === 0 ? "NOW" : `${mark.hoursAgo}h`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
