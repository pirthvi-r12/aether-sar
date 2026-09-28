import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "AETHER-SAR // Autonomous Maritime Dark Fleet & Radar Intelligence",
};

export default function HomePage() {
  return <LandingPage />;
}
