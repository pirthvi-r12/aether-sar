import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntelligenceBrief } from "@/components/brief/IntelligenceBrief";
import { incidentById } from "@/lib/data";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const incident = incidentById(params.id);
  return { title: incident ? incident.caseName : "Brief" };
}

export default function BriefPage({ params }: { params: { id: string } }) {
  if (!incidentById(params.id)) notFound();
  return <IntelligenceBrief id={params.id} />;
}
