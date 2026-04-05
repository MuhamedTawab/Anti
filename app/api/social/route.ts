import { NextRequest, NextResponse } from "next/server";

import { getSocialData } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getSocialData(identity));
}
