import { NextResponse } from "next/server";
import { readIncidents } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await readIncidents();
  return NextResponse.json(payload);
}
