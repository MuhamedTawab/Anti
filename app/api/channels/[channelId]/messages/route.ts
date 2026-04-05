import { NextRequest, NextResponse } from "next/server";

import { addMessage, getMessages } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;

  return NextResponse.json({
    messages: await getMessages(channelId)
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const body = (await request.json()) as { body?: string };

  if (!body.body?.trim()) {
    return NextResponse.json(
      { error: "Message body is required." },
      { status: 400 }
    );
  }

  const message = await addMessage(channelId, body.body);

  return NextResponse.json({ message }, { status: 201 });
}
