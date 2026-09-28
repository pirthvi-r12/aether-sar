import { NextResponse } from "next/server";
import { readVessels } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await readVessels();
  return NextResponse.json(payload);
}
