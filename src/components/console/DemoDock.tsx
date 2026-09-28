"use client";

import { Crosshair, FileText, Radar } from "lucide-react";
import type { DemoId } from "@/lib/demos";

const SCENARIOS: { id: DemoId; icon: typeof Radar; label: string }[] = [
  { id: "sts", icon: Radar, label: "Simulate Illegal STS Oil Transfer in Gulf of Oman" },
  { id: "spoof", icon: Crosshair, label: "Detect GPS Spoofing Anomaly in Baltic Sea" },
  { id: "pdf", icon: FileText, label: "Generate Defense PDF Report" },
];

export function DemoDock({ onRun, className = "" }: { onRun: (id: DemoId) => void; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-2 ${className}`}>
      <div className="mb-1 px-2 font-mono text-[10px] tracking-[0.28em] text-white/50">CLIENT DEMO CONTROL</div>
      <div className="grid gap-2 md:grid-cols-3">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onRun(scenario.id)}
              className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-aether-cyan/50 hover:bg-aether-cyan/10"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-aether-cyan" />
              <span className="text-[12px] leading-snug text-white/90">{scenario.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
