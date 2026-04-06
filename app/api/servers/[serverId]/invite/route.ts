import { NextRequest, NextResponse } from "next/server";

import { createServerInvite } from "@/lib/data";
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

  try {
    const invite = await createServerInvite(identity, serverId);
    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create invite." },
      { status: 400 }
    );
  }
}
