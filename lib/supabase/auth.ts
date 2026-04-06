import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { hasSupabasePublicEnv } from "@/lib/env";
import type { AuthIdentity } from "@/lib/types";

function getTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function formatIdentity(user: {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
}): AuthIdentity {
  const email = user.email ?? "unknown@anti.local";
  const emailName = email.split("@")[0] || "pilot";
  const preferredName =
    user.user_metadata?.name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    emailName;

  return {
    id: user.id,
    email,
    name: preferredName,
    handle: `@${emailName.toLowerCase()}`
  };
}

/**
 * Derives the authenticated identity exclusively from a verified Supabase JWT,
 * then enriches it with the user's saved profile (name, handle, avatarUrl) from
 * the profiles table so that custom display names are always used.
 */
export async function getAuthenticatedIdentity(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  // Start with JWT-derived identity as a safe fallback
  const jwtIdentity = formatIdentity(data.user);

  // Enrich with the actual profile row so custom name/handle/avatar are used
  const { data: profile } = await supabase
    .from("profiles")
    .select("name,handle,avatar_url,bio")
    .eq("id", jwtIdentity.id)
    .maybeSingle();

  if (!profile) {
    return jwtIdentity;
  }

  return {
    ...jwtIdentity,
    name: profile.name ?? jwtIdentity.name,
    handle: profile.handle ?? jwtIdentity.handle,
    avatarUrl: profile.avatar_url ?? null,
    bio: profile.bio ?? undefined
  };
}
