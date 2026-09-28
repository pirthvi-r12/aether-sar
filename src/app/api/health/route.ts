import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await pingDatabase();
  return NextResponse.json({ ok: true, service: "aether-sar", database });
}
