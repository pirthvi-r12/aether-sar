"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FileText, Radar, Shield, Ship } from "lucide-react";
import { MagneticButton } from "@/components/ui/MagneticButton";
import type { DemoId } from "@/lib/demos";

type Instrument = "radar" | "spoof" | "sts" | "dossier";

type VesselRow = {
  name: string;
  imo: string | null;
  mmsi: string | null;
  flag_country: string;
  length_meters: number | string;
  status: string;
};

type TimelineEvent = { hoursAgo?: number; label?: string };

type IncidentRow = {
  title: string;
  incident_type: string;
  severity: string;
  anomaly_id: number | null;
  intelligence_summary: string;
  timeline_json: string | TimelineEvent[] | null;
};

type Catalog = {
  driver?: string;
  vessels?: number;
  incidents?: number;
  anomalies?: number;
  passes?: number;
  file?: string | null;
};

const FALLBACK_STS =
  "Transponder killed 14 hours ago in the Persian Gulf. Radar detected ORION STAR side-by-side with an unflagged 280 m supertanker. Kinematic length profile matches at 96.8 percent.";
const FALLBACK_SPOOF =
  "VOLGA-7 is broadcasting a closed AIS loop over Tallinn Airport while Capella radar places the hull 80 nautical miles offshore.";

function parseTimeline(value: IncidentRow["timeline_json"]): TimelineEvent[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as TimelineEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function vesselNamed(vessels: VesselRow[], fragment: string) {
  return vessels.find((vessel) => vessel.name.toUpperCase().includes(fragment));
}

function TiltCard({
  children,
  active,
  onSelect,
}: {
  children: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 180, damping: 18 });
  const [spot, setSpot] = useState({ x: 50, y: 30 });

  return (
    <motion.article
      ref={ref}
      role="button"
      tabIndex={0}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onMouseMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        px.set(x);
        py.set(y);
        setSpot({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
      }}
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className={`glass relative cursor-pointer overflow-hidden rounded-3xl p-5 text-left outline-none ring-aether-cyan/70 focus-visible:ring-2 ${
        active ? "ring-2" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(420px circle at ${spot.x}% ${spot.y}%, rgba(0,240,255,0.16), transparent 42%)` }}
      />
      <div className="relative">{children}</div>
    </motion.article>
  );
}

function RadarPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 520;
    canvas.height = 220;
    let frame = 0;
    const draw = (time: number) => {
      ctx.fillStyle = "#071018";
      ctx.fillRect(0, 0, 520, 220);
      for (let i = 0; i < 700; i++) {
        const x = (i * 97 + Math.floor(time / 80)) % 520;
        const y = (i * 53) % 220;
        const v = (Math.sin(i * 12.1 + time / 900) + 1) / 2;
        ctx.fillStyle = `rgba(${20 + v * 40}, ${40 + v * 30}, ${70 + v * 20}, 0.85)`;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = "#fff4df";
      ctx.beginPath();
      ctx.ellipse(250, 112, 54, 12, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,42,66,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(188, 86, 128, 52);
      ctx.fillStyle = "rgba(0,240,255,0.18)";
      ctx.fillRect(0, (time / 18) % 220, 520, 8);
      ctx.strokeStyle = "rgba(0,240,255,0.7)";
      ctx.strokeRect(8, 8, 504, 204);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="relative mt-4">
      <canvas ref={ref} className="pointer-events-none h-36 w-full rounded-xl" />
      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] tracking-[0.14em] text-aether-cyan">
        ANOMALY #8491 · 14.8 dB
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-white/80">
        24°18&apos;N 58°31&apos;E · 280 m
      </div>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const [shown, setShown] = useState(12);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setShown((value) => (value >= score ? score : Math.min(score, value + 1.4)));
    }, 40);
    return () => window.clearInterval(timer);
  }, [score]);
  const ratio = Math.max(0, Math.min(1, shown / 100));
  return (
    <div className="mt-4 grid grid-cols-[140px_1fr] items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32">
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="#FFB800"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 46 * ratio} ${2 * Math.PI * 46}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" fill="white" fontSize="22" fontFamily="ui-monospace, monospace">
          {shown.toFixed(0)}%
        </text>
        <text x="60" y="76" textAnchor="middle" fill="#FFB800" fontSize="8" fontFamily="ui-monospace, monospace">
          SPOOF P
        </text>
      </svg>
      <div className="space-y-2 font-mono text-[11px] text-white/70">
        <p className={shown > 30 ? "text-white" : ""}>AIS loop over Tallinn Airport</p>
        <p className={shown > 60 ? "text-white" : ""}>Radar hull 80 nm offshore</p>
        <p className={shown > 85 ? "text-aether-amber" : ""}>Anomaly #8504 ghost flag armed</p>
      </div>
    </div>
  );
}

function StsLock() {
  const [separation, setSeparation] = useState(1.6);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeparation((value) => {
        const next = Math.round((value - 0.08) * 100) / 100;
        return next < 0.4 ? 1.6 : next;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, []);
  const close = (1.6 - separation) / 1.2;
  return (
    <div className="relative mt-6 h-36 overflow-hidden rounded-xl border border-white/10 bg-[#071018]">
      <div
        className="absolute top-10 h-8 w-28 -rotate-6 rounded-full border border-aether-red/80 bg-aether-red/20"
        style={{ left: `${16 + close * 6}%` }}
      />
      <div
        className="absolute top-14 h-8 w-32 -rotate-6 rounded-full border border-aether-amber/80 bg-aether-amber/20"
        style={{ left: `${46 - close * 10}%` }}
      />
      <span className="absolute left-3 top-3 font-mono text-[10px] tracking-[0.14em] text-white/55">ORION STAR</span>
      <span className="absolute right-3 top-3 font-mono text-[10px] tracking-[0.14em] text-aether-amber">KH-04</span>
      <span className="absolute bottom-3 left-3 font-mono text-[10px] text-white/80">{separation.toFixed(1)} NM SEPARATION</span>
      <span className="absolute bottom-3 right-3 font-mono text-[10px] text-aether-red">
        {separation <= 0.5 ? "STS LOCK" : "CLOSING"}
      </span>
    </div>
  );
}

export function FusionStack({ onRun }: { onRun: (id: DemoId) => void }) {
  const [active, setActive] = useState<Instrument>("sts");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/catalog").then((response) => response.json()),
      fetch("/api/vessels").then((response) => response.json()),
      fetch("/api/incidents").then((response) => response.json()),
    ])
      .then(([catalogPayload, vesselPayload, incidentPayload]) => {
        if (cancelled) return;
        setCatalog(catalogPayload as Catalog);
        setVessels((vesselPayload.vessels ?? []) as VesselRow[]);
        setIncidents((incidentPayload.incidents ?? []) as IncidentRow[]);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sts = incidents.find((incident) => incident.incident_type === "sts_transfer");
  const spoof = incidents.find((incident) => incident.incident_type === "transponder_spoof");
  const orion = vesselNamed(vessels, "ORION");
  const ghost = vesselNamed(vessels, "UNFLAGGED");
  const volga = vesselNamed(vessels, "VOLGA");
  const feed = catalog?.driver ? `${catalog.driver.toUpperCase()} · ${catalog.file ?? "darkfleet"}` : "LOCAL FEED";

  const panels: Record<
    Instrument,
    { kicker: string; title: string; body: string; facts: [string, string][]; timeline: TimelineEvent[]; action: string; run: () => void }
  > = {
    radar: {
      kicker: "SENTINEL-1B C-BAND · GULF OF OMAN",
      title: "Anomaly #8491 is a metal hull with no AIS",
      body:
        sts?.intelligence_summary ??
        "Raw backscatter isolates a 280 m hull at 24°18'N 58°31'E. Return 14.8 dB. Nearest honest AIS is 18.4 nm away.",
      facts: [
        ["RETURN", "14.8 dB"],
        ["LENGTH", "280 m"],
        ["PASS", "Sentinel-1B"],
        ["STATUS", "confirmed dark fleet"],
      ],
      timeline: parseTimeline(sts?.timeline_json ?? null).slice(-3),
      action: "Open the SAR lock",
      run: () => onRun("sts"),
    },
    spoof: {
      kicker: "CAPELLA-2 X-BAND · BALTIC",
      title: volga ? `${volga.name} · ${volga.flag_country}` : "Ghost Cargo VOLGA-7",
      body: spoof?.intelligence_summary ?? FALLBACK_SPOOF,
      facts: [
        ["MMSI", volga?.mmsi ?? "273456110"],
        ["SPOOF", "Tallinn Airport"],
        ["RADAR OFFSET", "80 nm"],
        ["ANOMALY", "#8504"],
      ],
      timeline: parseTimeline(spoof?.timeline_json ?? null),
      action: "Open the spoof track",
      run: () => onRun("spoof"),
    },
    sts: {
      kicker: "SHIP-TO-SHIP · GULF OF OMAN",
      title: sts?.title ?? "Vessel ORION STAR (Flag: Panama)",
      body: sts?.intelligence_summary ?? FALLBACK_STS,
      facts: [
        ["ORION MMSI", orion?.mmsi ?? "357891004"],
        ["PAIR", ghost?.name ?? "UNFLAGGED HULL KH-04"],
        ["SEPARATION", "0.4 nm"],
        ["MATCH", "96.8%"],
      ],
      timeline: parseTimeline(sts?.timeline_json ?? null),
      action: "Run the STS transfer",
      run: () => onRun("sts"),
    },
    dossier: {
      kicker: "AETHER RESTRICTED · CASE ALPHA",
      title: "ORION STAR enforcement brief",
      body:
        "Print-ready brief for the Panama-flagged tanker: AIS drop, Sentinel-1 crop, 0.4 nm rendezvous, and the 14-hour dark period.",
      facts: [
        ["CASE", "ALPHA"],
        ["IMO", orion?.imo ?? "9384412"],
        ["FLAG", orion?.flag_country ?? "Panama"],
        ["SEVERITY", (sts?.severity ?? "critical").toUpperCase()],
      ],
      timeline: parseTimeline(sts?.timeline_json ?? null).slice(0, 4),
      action: "Compile the brief",
      run: () => onRun("pdf"),
    },
  };

  const panel = panels[active];

  return (
    <section id="capabilities" className="relative z-10 mx-auto max-w-7xl px-6 py-20" style={{ perspective: 1400 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-aether-cyan">FUSION STACK</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl text-white sm:text-5xl">Four instruments. One orbital picture.</h2>
        </div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-aether-emerald">
          {feed}
          {catalog ? ` · ${catalog.vessels ?? 0} HULLS · ${catalog.anomalies ?? 0} ANOMALIES` : ""}
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <TiltCard active={active === "radar"} onSelect={() => setActive("radar")}>
          <div className="flex items-center gap-2 text-aether-cyan">
            <Radar className="h-4 w-4" />
            <span className="font-mono text-[11px] tracking-[0.18em]">COG RADAR LAYER</span>
          </div>
          <h3 className="mt-3 text-2xl text-white">Cloud-Optimized GeoTIFF backscatter</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Sentinel-1B C-band pixels over the Gulf of Oman. The bright return is anomaly #8491, a 280 m hull with no matching transponder.
          </p>
          <RadarPreview />
        </TiltCard>
        <TiltCard active={active === "spoof"} onSelect={() => setActive("spoof")}>
          <div className="flex items-center gap-2 text-aether-amber">
            <Ship className="h-4 w-4" />
            <span className="font-mono text-[11px] tracking-[0.18em]">AIS SPOOFING</span>
          </div>
          <h3 className="mt-3 text-2xl text-white">Ghost vessel flagging</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {volga?.name ?? "VOLGA-7"} ({volga?.flag_country ?? "Cameroon"}) broadcasts from an airport. Radar holds the hull in the Baltic.
          </p>
          <Gauge score={91.5} />
        </TiltCard>
        <TiltCard active={active === "sts"} onSelect={() => setActive("sts")}>
          <div className="flex items-center gap-2 text-aether-red">
            <Shield className="h-4 w-4" />
            <span className="font-mono text-[11px] tracking-[0.18em]">STS RECOGNITION</span>
          </div>
          <h3 className="mt-3 text-2xl text-white">Ship-to-ship transfer lock</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {orion?.name ?? "ORION STAR"} and {ghost?.name ?? "unflagged hull KH-04"} close to 0.4 nm inside one radar cell.
          </p>
          <StsLock />
        </TiltCard>
        <TiltCard active={active === "dossier"} onSelect={() => setActive("dossier")}>
          <div className="flex items-center gap-2 text-aether-emerald">
            <FileText className="h-4 w-4" />
            <span className="font-mono text-[11px] tracking-[0.18em]">DOSSIER COMPILER</span>
          </div>
          <h3 className="mt-3 text-2xl text-white">Naval intelligence export</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Case Alpha compiles the Hormuz dark period, the SAR crop, and the infraction timeline into one enforcement brief.
          </p>
          <div className="mt-5 rounded-xl bg-[#f3efe4] p-4 text-[#1a1d24]">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#8d1d2c]">AETHER RESTRICTED</p>
            <p className="mt-2 font-display text-lg">CASE ALPHA // ORION STAR</p>
            <p className="mt-2 text-xs leading-relaxed text-[#1a1d24]/80">
              AIS dark 14h · MMSI {orion?.mmsi ?? "357891004"} · anomaly #8491 · 14.8 dB · 0.4 nm rendezvous, Gulf of Oman.
            </p>
          </div>
        </TiltCard>
      </div>

      <div className="glass mt-4 rounded-3xl p-5 sm:p-6">
        <p className="font-mono text-[10px] tracking-[0.22em] text-aether-cyan">{panel.kicker}</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h3 className="font-display text-3xl text-white">{panel.title}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75">{panel.body}</p>
            <ol className="mt-5 space-y-2">
              {panel.timeline.map((event) => (
                <li key={`${event.hoursAgo}-${event.label}`} className="flex gap-3 font-mono text-[11px] text-white/70">
                  <span className="w-12 shrink-0 text-aether-amber">T-{event.hoursAgo ?? 0}h</span>
                  <span>{event.label}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <dl className="grid grid-cols-2 gap-3">
              {panel.facts.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
                  <dt className="font-mono text-[9px] tracking-[0.16em] text-white/45">{label}</dt>
                  <dd className="mt-1 font-mono text-sm text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <MagneticButton onClick={panel.run}>{panel.action}</MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
