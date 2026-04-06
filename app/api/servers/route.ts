import { NextRequest, NextResponse } from "next/server";

import { createServer, getBootstrap } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);
  return NextResponse.json({
    servers: (await getBootstrap(identity ?? undefined)).servers
  });
}

export async function POST(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };

  try {
    const serverId = await createServer(identity, body.name ?? "");
    return NextResponse.json({ serverId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create server." },
      { status: 400 }
    );
  }
}
