"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ThinkingOrb } from "@/components/ui/ThinkingOrb";
import { hydrateMute, setMuted } from "@/lib/audio";
import { TELEMETRY } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { useEngineSnapshot } from "@/components/console/engine-context";

export function StatusBar() {
  const snap = useEngineSnapshot();
  const [clock, setClock] = useState("--:--:--");
  const [pings, setPings] = useState(TELEMETRY.pings);
  const [vessels, setVessels] = useState(TELEMETRY.vessels);
  const [muted, setMutedState] = useState(false);
  const [database, setDatabase] = useState("SQL");

  useEffect(() => {
    setMutedState(hydrateMute());
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((payload: { driver?: string; vessels?: number }) => {
        const driver = (payload.driver ?? "sql").toUpperCase();
        setDatabase(`${driver} · ${payload.vessels ?? 0} HULLS`);
      })
      .catch(() => setDatabase("SQL OFFLINE"));
    const tick = () => setClock(new Date().toISOString().slice(11, 19));
    tick();
    const clockId = window.setInterval(tick, 1000);
    const fluxId = window.setInterval(() => {
      setPings(4680 + Math.floor(Math.random() * 340));
      setVessels((value) => value + Math.floor(Math.random() * 4));
    }, 1100);
    return () => {
      window.clearInterval(clockId);
      window.clearInterval(fluxId);
    };
  }, []);

  const counters = [
    ["SATELLITES ON STATION", String(TELEMETRY.satellites), "text-aether-emerald"],
    ["VESSELS TRACKED", formatNumber(vessels), "text-aether-cyan"],
    ["UNMATCHED RADAR BLIPS", String(TELEMETRY.blips), snap.orb === "locked" ? "text-aether-red" : "text-aether-amber"],
    ["LIVE AIS INGESTION", `${formatNumber(pings)} pings/sec`, "text-white"],
  ] as const;

  return (
    <header className="relative z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-[#070b13]/80 px-3 backdrop-blur-xl">
      <Link href="/" className="hidden shrink-0 font-display tracking-[0.16em] text-white sm:block">
        AETHER-SAR
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <ThinkingOrb state={snap.orb} size={54} showLabel={false} />
        <p className="hidden max-w-md truncate font-mono text-[11px] text-white/80 md:block">{snap.ticker}</p>
      </div>
      <div className="hidden items-center gap-4 xl:flex">
        {counters.map(([label, value, color]) => (
          <div key={label} className="text-right">
            <div className="font-mono text-[9px] tracking-[0.16em] text-white/45">{label}</div>
            <div className={`font-mono text-sm tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-aether-cyan">
        <span className="hidden rounded-full border border-aether-emerald/30 px-2 py-1 text-[10px] tracking-[0.14em] text-aether-emerald md:inline">
          {database}
        </span>
        <span className="hidden sm:inline">{clock} UTC</span>
        <button
          type="button"
          aria-label={muted ? "Unmute sonar" : "Mute sonar"}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
