import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await readCatalog();
  return NextResponse.json(catalog);
}
