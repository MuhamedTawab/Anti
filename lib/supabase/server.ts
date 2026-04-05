import { createClient } from "@supabase/supabase-js";

import { hasSupabaseEnv } from "@/lib/env";

export function getSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
