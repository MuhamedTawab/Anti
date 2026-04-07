import { NextRequest, NextResponse } from "next/server";

import { addMessage, getMessages } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const identity = await getAuthenticatedIdentity(request);
  const before = request.nextUrl.searchParams.get("before") ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);

  return NextResponse.json({
    messages: await getMessages(channelId, identity ?? undefined, before, limit)
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const body = (await request.json()) as { body?: string; attachmentUrl?: string | null };
  const identity = await getAuthenticatedIdentity(request);

  if (!body.body?.trim() && !body.attachmentUrl?.trim()) {
    return NextResponse.json(
      { error: "Message body or attachment is required." },
      { status: 400 }
    );
  }

  if (hasSupabaseEnv() && !identity) {
    return NextResponse.json(
      { error: "Sign in to send messages." },
      { status: 401 }
    );
  }

  const message = await addMessage(
    channelId,
    body.body ?? "",
    identity ?? undefined,
    body.attachmentUrl ?? null
  );

  return NextResponse.json({ message }, { status: 201 });
}
