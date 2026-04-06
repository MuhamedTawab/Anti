import { NextRequest, NextResponse } from "next/server";

import { addDirectMessage, getDirectMessages } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;

  try {
    return NextResponse.json({
      messages: await getDirectMessages(threadId, identity)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load direct messages." },
      { status: 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const body = (await request.json()) as { body?: string; attachmentUrl?: string | null };

  if (!body.body?.trim() && !body.attachmentUrl?.trim()) {
    return NextResponse.json({ error: "Message body or attachment is required." }, { status: 400 });
  }

  try {
    const message = await addDirectMessage(threadId, body.body ?? "", identity, body.attachmentUrl ?? null);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send direct message." },
      { status: 400 }
    );
  }
}
