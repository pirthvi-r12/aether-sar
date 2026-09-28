"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Satellite } from "lucide-react";
import { SarCrop, type SarVariant } from "@/components/ui/SarCrop";
import { useEngine, useEngineSnapshot } from "@/components/console/engine-context";
import { TRAFFIC, incidentForVessel, vesselById } from "@/lib/data";
import { formatCoord } from "@/lib/format";
import { sampleTrack } from "@/lib/simulation";

function variantFor(category?: string): SarVariant {
  if (category === "sts_transfer") return "sts";
  if (category === "iuu_fishing") return "cluster";
  if (category === "transponder_spoof") return "spoof";
  return "single";
}

export const DossierPanel = memo(function DossierPanel({ className = "" }: { className?: string }) {
  const engine = useEngine();
  const snap = useEngineSnapshot();
  const router = useRouter();
  const id = snap.selectedId;
  if (!id) return null;

  const vessel = vesselById(id);
  const traffic = TRAFFIC.find((item) => item.id === id);
  const incident = vessel ? incidentForVessel(vessel.id) : undefined;
  const pose = vessel ? sampleTrack(vessel.track, snap.hoursAgo) : null;

  return (
    <aside className={`glass flex flex-col overflow-hidden rounded-3xl ${className}`}>
      <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-aether-cyan">TARGET FORENSIC DOSSIER</p>
          <h2 className="mt-1 text-lg text-white">{vessel?.name ?? traffic?.name}</h2>
        </div>
        <button type="button" className="text-xs text-white/50" onClick={() => engine.setSelected(null)}>
          Close
        </button>
      </div>
      <div className="tactical-scroll flex-1 space-y-4 overflow-auto p-4">
        {traffic && !vessel && (
          <div>
            <p className="font-mono text-xs text-aether-emerald">CLEAN CLEARANCE</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Kinematic profile matches AIS. No unmatched SAR return within 25 nm. {traffic.flag} flag, {traffic.length} m {traffic.type.replace("_", " ")}.
            </p>
            <p className="mt-3 font-mono text-[11px] text-white/50">MMSI {traffic.mmsi}</p>
          </div>
        )}
        {vessel && pose && (
          <>
            <SarCrop
              variant={variantFor(incident?.category)}
              backscatter={vessel.radar?.backscatter ?? 9.4}
              coordinate={formatCoord(vessel.radar?.lat ?? pose.lat, vessel.radar?.lng ?? pose.lng)}
            />
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[11px]">
              <div><dt className="text-white/40">FLAG</dt><dd>{vessel.flag}</dd></div>
              <div><dt className="text-white/40">IMO</dt><dd>{vessel.imo ?? "UNREGISTERED"}</dd></div>
              <div><dt className="text-white/40">MMSI</dt><dd>{vessel.mmsi ?? "NO TRANSPONDER"}</dd></div>
              <div><dt className="text-white/40">TYPE</dt><dd>{vessel.type.replace("_", " ")}</dd></div>
              <div><dt className="text-white/40">LENGTH</dt><dd>{vessel.length} m</dd></div>
              <div><dt className="text-white/40">BEAM</dt><dd>{vessel.beam} m</dd></div>
              <div><dt className="text-white/40">DRAFT</dt><dd>{vessel.draft} m</dd></div>
              <div><dt className="text-white/40">DISPLACEMENT</dt><dd>{vessel.displacement.toLocaleString("en-US")} t</dd></div>
            </dl>
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-white/45">POSITION AT {snap.hoursAgo.toFixed(1)}h AGO</p>
              <p className="mt-1 font-mono text-sm text-aether-cyan">{formatCoord(pose.lat, pose.lng)}</p>
            </div>
            {incident && (
              <>
                <p className="text-sm leading-relaxed text-white/75">{incident.intelligence}</p>
                <p className="font-mono text-sm text-aether-emerald">{incident.confidenceLabel}</p>
                <ol className="space-y-2 border-l border-white/15 pl-3">
                  {incident.timeline.map((event) => (
                    <li key={event.label} className="text-xs text-white/70">
                      <span className="font-mono text-aether-amber">T-{event.hoursAgo}h</span> {event.label}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {snap.retaskId === vessel.id && (
              <p className="rounded-xl border border-aether-emerald/40 bg-aether-emerald/10 px-3 py-2 font-mono text-[11px] text-aether-emerald">
                {snap.notice}
              </p>
            )}
            <div className="grid gap-2">
              {incident && (
                <button
                  type="button"
                  onClick={() => router.push(`/brief/${incident.id}`)}
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#071018]"
                >
                  <FileText className="h-4 w-4" /> Export Naval Intelligence Dossier
                </button>
              )}
              <button
                type="button"
                onClick={() => engine.retask()}
                className="flex items-center justify-center gap-2 rounded-full border border-aether-cyan/40 px-3 py-2 text-sm text-aether-cyan"
              >
                <Satellite className="h-4 w-4" /> Task Priority Satellite Retask
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
});
