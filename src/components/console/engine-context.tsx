"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { SimEngine } from "@/lib/engine";

const EngineContext = createContext<SimEngine | null>(null);

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [engine] = useState(() => new SimEngine());
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): SimEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("Surveillance engine is not mounted");
  return engine;
}

export function useEngineSnapshot() {
  const engine = useEngine();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}
