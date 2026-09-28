import { NextResponse } from "next/server";
import { storeBriefing } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOCUS = new Set(["dark-fleet", "sanctions", "iuu", "overview"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    organization?: string;
    email?: string;
    focus?: string;
    windowPref?: string;
  } | null;

  const fullName = body?.fullName?.trim() ?? "";
  const organization = body?.organization?.trim() ?? "";
  const email = body?.email?.trim() ?? "";
  const focus = body?.focus?.trim() ?? "";
  const windowPref = body?.windowPref?.trim() ?? "";

  if (fullName.length < 2 || organization.length < 2 || !email.includes("@") || !FOCUS.has(focus)) {
    return NextResponse.json({ ok: false, error: "Check name, organization, email, and focus." }, { status: 400 });
  }

  const id = Date.now();
  const mode = await storeBriefing({ id, fullName, organization, email, focus, windowPref });
  const reference = `BRF-${String(id).slice(-8)}`;
  return NextResponse.json({ ok: true, reference, mode });
}
