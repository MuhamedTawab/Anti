import { NextRequest, NextResponse } from "next/server";

import { ensureProfile, getProfile, updateProfile } from "@/lib/data";
import { getAuthenticatedIdentity } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ profile: await getProfile(identity) });
}

export async function POST(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureProfile(identity);

  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(request: NextRequest) {
  const identity = await getAuthenticatedIdentity(request);

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    handle?: string;
    avatarUrl?: string | null;
    bio?: string;
  };

  try {
    const profile = await updateProfile(identity, body);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update profile." },
      { status: 400 }
    );
  }
}
