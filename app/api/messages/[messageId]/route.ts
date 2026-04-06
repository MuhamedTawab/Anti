import { NextRequest, NextResponse } from "next/server";

import { deleteServerMessage } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  try {
    await deleteServerMessage(messageId, identity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete message." },
      { status: 400 }
    );
  }
}
