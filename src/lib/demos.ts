import { incidentById } from "@/lib/data";
import type { SimEngine } from "@/lib/engine";
import type { Incident } from "@/lib/types";

export function focusIncident(engine: SimEngine, incident: Incident): void {
  engine.setSelected(incident.vesselId);
  engine.flyTo(incident.region);
  engine.setNotice(null);
  if (incident.category === "transponder_spoof") {
    engine.setOrb("locked", "Spoof confirmed // AIS ashore, hull 80 nm offshore");
  } else if (incident.severity === "critical") {
    engine.setOrb("locked", "Dark Tanker Anomaly Confirmed // Radar Return 14.8 dB");
  } else {
    engine.setOrb("correlating", "Correlating SAR pass against AIS transponder logs...");
  }
}

export type DemoId = "sts" | "spoof" | "pdf";

export function playDemo(engine: SimEngine, id: Exclude<DemoId, "pdf">): () => void {
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    timers.push(window.setTimeout(fn, ms));
  };

  engine.clearDemo();
  engine.demo = id;

  if (id === "sts") {
    const incident = incidentById("alpha");
    if (!incident) return () => undefined;
    engine.setFilter("sts_transfer");
    engine.setSelected("orion");
    engine.setHours(22);
    engine.flyTo(incident.region);
    engine.setOrb("correlating", "Correlating Sentinel-1 C-Band pass against AIS transponder logs...");
    later(1000, () => engine.playToward(6));
    later(7000, () => {
      engine.setHours(6);
      engine.setOrb("locked", "Dark Tanker Anomaly Confirmed // Radar Return 14.8 dB");
      engine.setNotice("SAR LOCK // Dual hull 0.4 nm // anomaly #8491 // 14.8 dB");
    });
  } else {
    const incident = incidentById("bravo");
    if (!incident) return () => undefined;
    engine.setFilter("all");
    engine.setSelected("volga");
    engine.setHours(16);
    engine.flyTo(incident.region);
    engine.setOrb("correlating", "Correlating Capella X-band swath against the broadcast AIS loop...");
    later(1000, () => engine.playToward(5));
    later(5600, () => {
      engine.setHours(5);
      engine.setOrb("locked", "Spoof confirmed // AIS ashore, hull 80 nm offshore");
      engine.setNotice("GPS SPOOF // Tallinn Airport loop vs Baltic hull // anomaly #8504");
    });
  }

  return () => timers.forEach((timer) => window.clearTimeout(timer));
}
