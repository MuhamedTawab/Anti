import { NextRequest, NextResponse } from "next/server";

import { joinServerByInvite } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  try {
    const serverId = await joinServerByInvite(identity, code);
    return NextResponse.json({ serverId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join server." },
      { status: 400 }
    );
  }
}
