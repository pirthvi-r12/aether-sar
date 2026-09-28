import type { Metadata } from "next";
import { Suspense } from "react";
import { SurveillanceConsole } from "@/components/console/SurveillanceConsole";

export const metadata: Metadata = {
  title: "Surveillance Console",
};

function ConsoleFallback() {
  return (
    <div className="grid h-[100dvh] place-items-center bg-aether-void">
      <div className="text-center">
        <p className="font-mono text-[11px] tracking-[0.32em] text-aether-cyan">ACQUIRING TACTICAL PICTURE</p>
        <p className="mt-3 text-white/70">Fusing SAR swaths with live AIS.</p>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  return (
    <Suspense fallback={<ConsoleFallback />}>
      <SurveillanceConsole />
    </Suspense>
  );
}
