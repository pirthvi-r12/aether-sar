"use client";

import { memo } from "react";
import { INCIDENTS } from "@/lib/data";
import { focusIncident } from "@/lib/demos";
import type { QueueFilter } from "@/lib/types";
import { useEngine, useEngineSnapshot } from "@/components/console/engine-context";

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "dark_tankers", label: "DARK TANKERS" },
  { id: "sts_transfer", label: "STS TRANSFERS" },
  { id: "sanctions_evasion", label: "SANCTIONS EVASION" },
];

function matches(filter: QueueFilter, incident: (typeof INCIDENTS)[number]) {
  if (filter === "all") return true;
  if (filter === "dark_tankers") return incident.darkTanker;
  return incident.category === filter;
}

const TONE = {
  critical: "text-aether-red border-aether-red/40",
  high: "text-aether-amber border-aether-amber/40",
  medium: "text-aether-cyan border-aether-cyan/40",
};

export const IncidentQueue = memo(function IncidentQueue({ className = "" }: { className?: string }) {
  const engine = useEngine();
  const snap = useEngineSnapshot();
  const visible = INCIDENTS.filter((incident) => matches(snap.filter, incident));

  return (
    <aside className={`glass flex flex-col rounded-3xl ${className}`}>
      <div className="border-b border-white/10 px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-aether-cyan">TARGET INCIDENT QUEUE</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => engine.setFilter(filter.id)}
              className={`rounded-full px-2.5 py-1 font-mono text-[9px] tracking-wide ${
                snap.filter === filter.id ? "bg-aether-cyan text-[#041014]" : "border border-white/10 text-white/70"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tactical-scroll flex-1 space-y-2 overflow-auto p-3">
        {visible.map((incident) => {
          const active = incident.vesselId === snap.selectedId || incident.relatedVesselIds.includes(snap.selectedId ?? "");
          return (
            <button
              key={incident.id}
              type="button"
              onClick={() => focusIncident(engine, incident)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                active ? "border-aether-cyan/60 bg-aether-cyan/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] tracking-[0.18em] text-white/50">{incident.caseName}</span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${TONE[incident.severity]}`}>
                  {incident.severity}
                </span>
              </div>
              <h3 className="mt-2 text-sm text-white">{incident.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{incident.summary}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
});
