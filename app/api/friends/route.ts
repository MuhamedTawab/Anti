import { NextRequest, NextResponse } from "next/server";

import { sendFriendRequest } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { email?: string };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Friend email is required." }, { status: 400 });
  }

  try {
    await sendFriendRequest(identity, body.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send friend request." },
      { status: 400 }
    );
  }
}
