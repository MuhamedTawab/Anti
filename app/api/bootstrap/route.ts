import { NextRequest, NextResponse } from "next/server";

import { getBootstrap } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);
  return NextResponse.json(await getBootstrap(identity ?? undefined));
}
