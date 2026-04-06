import { NextRequest, NextResponse } from "next/server";

import { moderateServerMember } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const body = (await request.json()) as { targetProfileId?: string; action?: "kick" | "ban" };

  if (!body.targetProfileId || !body.action) {
    return NextResponse.json({ error: "Target and action are required." }, { status: 400 });
  }

  try {
    await moderateServerMember(identity, serverId, body.targetProfileId, body.action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not moderate member." },
      { status: 400 }
    );
  }
}
