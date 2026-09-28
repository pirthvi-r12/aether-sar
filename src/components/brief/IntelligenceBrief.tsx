"use client";

import Link from "next/link";
import { SarCrop, type SarVariant } from "@/components/ui/SarCrop";
import { incidentById, vesselById } from "@/lib/data";
import { formatCoord } from "@/lib/format";
import { distanceNm } from "@/lib/nav";
import { sampleTrack } from "@/lib/simulation";

function variantFor(category: string): SarVariant {
  if (category === "sts_transfer") return "sts";
  if (category === "iuu_fishing") return "cluster";
  if (category === "transponder_spoof") return "spoof";
  return "single";
}

export function IntelligenceBrief({ id }: { id: string }) {
  const incident = incidentById(id);
  if (!incident) return null;
  const vessel = vesselById(incident.vesselId);
  const partner = incident.relatedVesselIds.map((vesselId) => vesselById(vesselId)).find(Boolean);
  const pose = vessel ? sampleTrack(vessel.track, 0) : null;
  const spoofDistance =
    vessel?.spoof && pose ? Math.round(distanceNm(vessel.spoof, pose)) : null;
  const issued = "2026-09-28T12:40:00Z";

  return (
    <main className="min-h-screen bg-[#070b12] px-4 py-8 text-[#16191f]">
      <div className="no-print mx-auto mb-4 flex max-w-[920px] items-center justify-between text-white">
        <Link href="/console" className="text-sm text-aether-cyan">
          Back to console
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-aether-cyan px-4 py-2 text-sm font-semibold text-[#041014]">
          Print / Save PDF
        </button>
      </div>
      <article className="brief-sheet mx-auto max-w-[920px] bg-[#f4f1e8] shadow-2xl">
        <header className="flex items-center justify-between bg-[#0c1c33] px-8 py-5 text-white">
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-[#7af6ff]">AETHER-SAR // NAVAL INTELLIGENCE BRIEF</p>
            <h1 className="mt-1 font-display text-3xl">{incident.caseName}</h1>
          </div>
          <p className="text-right font-mono text-[11px] text-white/70">
            REF {incident.anomalyId}
            <br />
            {issued}
          </p>
        </header>
        <div className="bg-[#8d1d2c] px-8 py-2 text-center font-mono text-[11px] tracking-[0.22em] text-white">
          AETHER RESTRICTED // SIMULATED BRIEFING PRODUCT // NOT A GOVERNMENT CLASSIFICATION
        </div>
        <div className="grid gap-8 px-8 py-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-3xl leading-tight">{incident.title}</h2>
            <p className="mt-4 text-sm leading-relaxed">{incident.intelligence}</p>
            <p className="mt-4 font-mono text-sm text-[#0c6b4d]">{incident.confidenceLabel}</p>
            {vessel && (
              <table className="mt-6 w-full text-left text-sm">
                <tbody>
                  {[
                    ["Name", vessel.name],
                    ["Flag", vessel.flag],
                    ["IMO", vessel.imo ?? "Unregistered"],
                    ["MMSI", vessel.mmsi ?? "No transponder"],
                    ["Type", vessel.type.replaceAll("_", " ")],
                    ["Length", `${vessel.length} m`],
                    ["Beam", `${vessel.beam} m`],
                    ["Draft", `${vessel.draft} m`],
                    ["Displacement", `${vessel.displacement.toLocaleString("en-US")} t`],
                    ["Status", vessel.status.replaceAll("_", " ")],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-black/10">
                      <th className="py-1.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-wider text-black/50">{label}</th>
                      <td className="py-1.5">{value}</td>
                    </tr>
                  ))}
                  {partner && (
                    <tr className="border-b border-black/10">
                      <th className="py-1.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-wider text-black/50">Alongside</th>
                      <td className="py-1.5">{partner.name} // {partner.length} m</td>
                    </tr>
                  )}
                  {spoofDistance != null && (
                    <tr>
                      <th className="py-1.5 pr-4 font-mono text-[11px] font-medium uppercase tracking-wider text-black/50">Spoof offset</th>
                      <td className="py-1.5">{spoofDistance} nautical miles</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <SarCrop
              animate={false}
              variant={variantFor(incident.category)}
              backscatter={vessel?.radar?.backscatter ?? 12}
              coordinate={pose ? formatCoord(vessel?.radar?.lat ?? pose.lat, vessel?.radar?.lng ?? pose.lng) : ""}
            />
            <p className="mt-2 font-mono text-[11px] text-black/60">False-color SAR crop. Bright pixels are high-backscatter metal against ocean clutter.</p>
          </div>
        </div>
        <section className="px-8 pb-8">
          <h3 className="font-mono text-[11px] tracking-[0.22em] text-black/50">INFRACTION TIMELINE</h3>
          <ol className="mt-3 space-y-2">
            {incident.timeline.map((event) => (
              <li key={event.label} className="grid grid-cols-[88px_1fr] gap-3 text-sm">
                <span className="font-mono text-[12px] text-[#8d1d2c]">T-{event.hoursAgo}h</span>
                <span>{event.label}</span>
              </li>
            ))}
          </ol>
        </section>
        <footer className="border-t border-black/10 px-8 py-4 font-mono text-[10px] leading-relaxed text-black/50">
          Simulated fusion product for commercial demonstration. Coordinates, radar decibels, and vessel identities in this brief are synthetic. Page 1 of 1.
        </footer>
      </article>
    </main>
  );
}
