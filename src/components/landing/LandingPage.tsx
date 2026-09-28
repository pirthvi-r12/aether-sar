"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DemoDock } from "@/components/console/DemoDock";
import { FusionStack } from "@/components/landing/FusionStack";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ThinkingOrb } from "@/components/ui/ThinkingOrb";
import type { DemoId } from "@/lib/demos";
import { TICKER } from "@/lib/data";
import type { OrbState } from "@/lib/types";

const GlobeScene = dynamic(() => import("@/components/landing/GlobeScene").then((mod) => mod.GlobeScene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="h-72 w-72 animate-pulse rounded-full border border-aether-cyan/30 shadow-cyan" />
    </div>
  ),
});

const CYCLE: OrbState[] = ["idle", "correlating", "locked"];

export function LandingPage() {
  const router = useRouter();
  const [orb, setOrb] = useState<OrbState>("idle");
  const [briefOpen, setBriefOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % CYCLE.length;
      setOrb(CYCLE[index]);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const runDemo = (id: DemoId) => {
    if (id === "pdf") router.push("/brief/alpha");
    else router.push(`/console?demo=${id}&r=${Date.now()}`);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-aether-void">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-aether-cyan/50 shadow-cyan">
            <span className="h-2.5 w-2.5 rounded-full bg-aether-cyan" />
          </span>
          <span>
            <span className="block font-display text-lg tracking-[0.18em] text-white">AETHER-SAR</span>
            <span className="block font-mono text-[10px] tracking-[0.22em] text-white/50">ORBITAL FUSION CORE</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a href="#capabilities">Capabilities</a>
          <Link href="/console">Console</Link>
          <Link href="/brief/alpha">Sample brief</Link>
        </nav>
      </header>

      <section className="relative">
        <div className="relative h-[70vw] min-h-[340px] max-h-[560px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:max-h-none lg:w-[64%]">
          <GlobeScene />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-aether-void via-transparent to-aether-void/30 lg:bg-gradient-to-r lg:from-aether-void lg:via-aether-void/10 lg:to-transparent" />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="glass pointer-events-none absolute right-6 top-16 hidden w-56 rounded-2xl p-4 lg:block"
          >
            <p className="font-mono text-[10px] tracking-[0.22em] text-aether-emerald">SAR GROUND SWATH</p>
            <p className="mt-2 text-sm text-white">Sentinel-1A over Strait of Hormuz</p>
            <p className="mt-1 font-mono text-[11px] text-white/60">C-BAND // 250 km FOOTPRINT</p>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="glass pointer-events-none absolute bottom-24 right-16 hidden w-60 rounded-2xl p-4 lg:block"
          >
            <p className="font-mono text-[10px] tracking-[0.22em] text-aether-red">UNMATCHED RETURN</p>
            <p className="mt-2 font-mono text-sm text-white">24°18&apos;N 58°31&apos;E</p>
            <p className="mt-1 text-xs text-white/60">280 m hull // 14.8 dB</p>
          </motion.div>
          <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] tracking-[0.28em] text-white/50 lg:block">
            DRAG TO ORBIT
          </p>
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-6 pb-16 pt-6 lg:min-h-[100dvh] lg:py-28">
          <div className="max-w-xl">
            <div className="glass inline-flex items-center gap-3 rounded-full px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aether-emerald opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-aether-emerald" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-aether-cyan sm:text-[11px]">
                ORBITAL SAR RADAR + AIS DEAD-RECKONING CORE v4.2
              </span>
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6vw,5.6rem)] leading-[0.92] text-white">
              Detect the <span className="text-aether-cyan">Invisible.</span>
              <br />
              Track the Dark Fleet from Space.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
              Cross-referencing billions of satellite Synthetic Aperture Radar (SAR) pulses with kinematic trajectory algorithms to unmask illegal oil transfers, transponder spoofing, and maritime embargo evasion in real-time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <MagneticButton onClick={() => router.push("/console")}>Launch Live Surveillance Console</MagneticButton>
              <MagneticButton variant="ghost" onClick={() => setBriefOpen(true)}>
                Schedule Defense Briefing
              </MagneticButton>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <ThinkingOrb state={orb} size={168} showLabel={false} />
              <div className="glass max-w-xs rounded-2xl p-4">
                <p className="font-mono text-[10px] tracking-[0.24em] text-aether-cyan">AGENT CORE</p>
                <p className="mt-2 font-mono text-xs leading-relaxed text-white/85">
                  {orb === "idle" && "Wide-area maritime scan. Constellation nominal."}
                  {orb === "correlating" && "Correlating Sentinel-1 C-Band pass against AIS transponder logs..."}
                  {orb === "locked" && "Dark Tanker Anomaly Confirmed // Radar Return 14.8 dB"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee relative z-20 border-y border-white/10 bg-black/40">
        <div className="marquee-track py-3">
          {[...TICKER, ...TICKER].map((item, index) => (
            <span key={`${item}-${index}`} className="mx-6 font-mono text-[12px] tracking-wide text-aether-cyan/90">
              {item}
              <span className="ml-6 text-aether-amber">●</span>
            </span>
          ))}
        </div>
      </div>

      <FusionStack onRun={runDemo} />

      <footer className="relative z-10 border-t border-white/10 px-6 pb-64 pt-8 text-center font-mono text-[11px] tracking-wide text-white/45">
        AETHER-SAR // SIMULATED ORBITAL FEED FOR COMMERCIAL BRIEFINGS // NOT AN OPERATIONAL MILITARY SYSTEM
      </footer>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(920px,calc(100%-1.5rem))] -translate-x-1/2">
        <DemoDock onRun={runDemo} />
      </div>

      {briefOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <form
            className="glass w-full max-w-lg rounded-3xl p-6"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              const form = new FormData(event.currentTarget);
              const response = await fetch("/api/briefing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullName: form.get("fullName"),
                  organization: form.get("organization"),
                  email: form.get("email"),
                  focus: form.get("focus"),
                  windowPref: form.get("windowPref"),
                }),
              });
              const payload = (await response.json()) as { ok?: boolean; reference?: string; error?: string };
              setPending(false);
              if (!response.ok || !payload.ok) {
                setError(payload.error ?? "Request failed.");
                return;
              }
              setSent(payload.reference ?? "LOGGED");
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.24em] text-aether-cyan">DEFENSE BRIEFING DESK</p>
                <h3 className="mt-2 font-display text-3xl text-white">Schedule a live orbital brief.</h3>
              </div>
              <button type="button" className="text-white/60" onClick={() => setBriefOpen(false)}>
                Close
              </button>
            </div>
            {sent ? (
              <p className="mt-6 font-mono text-sm text-aether-emerald">
                Request {sent} accepted. A liaison will answer inside four hours.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                <input name="fullName" required placeholder="Full name" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-aether-cyan" />
                <input name="organization" required placeholder="Organization" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-aether-cyan" />
                <input name="email" type="email" required placeholder="Work email" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-aether-cyan" />
                <select name="focus" defaultValue="dark-fleet" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none">
                  <option value="dark-fleet">Dark fleet STS</option>
                  <option value="sanctions">Sanctions evasion</option>
                  <option value="iuu">IUU fishing</option>
                  <option value="overview">Platform overview</option>
                </select>
                <input name="windowPref" placeholder="Preferred window (UTC)" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-aether-cyan" />
                {error && <p className="text-sm text-aether-red">{error}</p>}
                <MagneticButton type="submit" disabled={pending}>
                  {pending ? "Transmitting..." : "Request briefing"}
                </MagneticButton>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
