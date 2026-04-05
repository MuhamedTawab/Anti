import { NextRequest, NextResponse } from "next/server";

import { respondToFriendRequest } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const body = (await request.json()) as { action?: "accept" | "decline" };

  if (!body.action || !["accept", "decline"].includes(body.action)) {
    return NextResponse.json({ error: "A valid action is required." }, { status: 400 });
  }

  try {
    const threadId = await respondToFriendRequest(identity, requestId, body.action);
    return NextResponse.json({ ok: true, threadId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not respond to request." },
      { status: 400 }
    );
  }
}
