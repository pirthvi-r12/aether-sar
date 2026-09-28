"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DemoDock } from "@/components/console/DemoDock";
import { DossierPanel } from "@/components/console/DossierPanel";
import { EngineProvider, useEngine, useEngineSnapshot } from "@/components/console/engine-context";
import { IncidentQueue } from "@/components/console/IncidentQueue";
import { StatusBar } from "@/components/console/StatusBar";
import { TacticalMap } from "@/components/console/TacticalMap";
import { TimelineBar } from "@/components/console/TimelineBar";
import { armAudio } from "@/lib/audio";
import { incidentForVessel } from "@/lib/data";
import { playDemo, type DemoId } from "@/lib/demos";

function ConsoleShell() {
  const engine = useEngine();
  const snap = useEngineSnapshot();
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get("demo");
  const stamp = params.get("r");
  const [mobileQueue, setMobileQueue] = useState(false);
  const [mobileDossier, setMobileDossier] = useState(false);

  useEffect(() => {
    if (demo !== "sts" && demo !== "spoof") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      armAudio();
      engine.cancelDemo = playDemo(engine, demo);
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demo, stamp, engine]);

  useEffect(() => {
    if (snap.selectedId) setMobileDossier(true);
  }, [snap.selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        engine.togglePlay();
      }
      if (event.key === "Escape") engine.setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const run = (id: DemoId) => {
    armAudio();
    if (id === "pdf") {
      const incident = snap.selectedId ? incidentForVessel(snap.selectedId) : undefined;
      router.push(`/brief/${incident?.id ?? "alpha"}`);
      return;
    }
    engine.cancelDemo = playDemo(engine, id);
  };

  const edge = snap.orb === "locked" ? "edge-locked" : snap.orb === "correlating" ? "edge-amber" : "";

  return (
    <div className={`flex h-[100dvh] flex-col overflow-hidden bg-aether-void text-white ${edge}`}>
      <StatusBar />
      <div className="relative min-h-0 flex-1">
        <TacticalMap />
        <IncidentQueue className={`absolute left-3 top-3 bottom-[5.5rem] z-20 w-[min(340px,calc(100%-1.5rem))] ${mobileQueue ? "flex" : "hidden lg:flex"}`} />
        {snap.selectedId && (
          <DossierPanel className={`absolute right-3 top-3 bottom-[5.5rem] z-20 w-[min(380px,calc(100%-1.5rem))] ${mobileDossier ? "flex" : "hidden lg:flex"}`} />
        )}
        <div className="absolute left-3 top-3 z-30 flex gap-2 lg:hidden">
          <button type="button" className="glass rounded-full px-3 py-1 text-xs" onClick={() => setMobileQueue((open) => !open)}>
            Queue
          </button>
          <button type="button" className="glass rounded-full px-3 py-1 text-xs" onClick={() => setMobileDossier((open) => !open)}>
            Dossier
          </button>
        </div>
        {snap.notice && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-30 hidden -translate-x-1/2 rounded-full border border-aether-red/40 bg-black/60 px-4 py-2 font-mono text-[11px] text-aether-red lg:block">
            {snap.notice}
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 z-30 w-[min(680px,calc(100%-1.5rem))] -translate-x-1/2">
          <DemoDock onRun={run} />
        </div>
      </div>
      <TimelineBar />
    </div>
  );
}

export function SurveillanceConsole() {
  return (
    <EngineProvider>
      <ConsoleShell />
    </EngineProvider>
  );
}
