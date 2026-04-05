import { NextRequest, NextResponse } from "next/server";

import { ensureProfile } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(identity);

  return NextResponse.json({ ok: true });
}
