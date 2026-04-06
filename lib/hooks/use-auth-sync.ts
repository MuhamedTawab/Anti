"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AuthIdentity } from "@/lib/types";

function mapUser(user: User | null): AuthIdentity | null {
  if (!user?.email) {
    return null;
  }

  const emailName = user.email.split("@")[0] || "pilot";
  const preferredName =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    emailName;

  return {
    id: user.id,
    email: user.email,
    name: preferredName,
    handle: `@${emailName.toLowerCase()}`
  };
}

export interface AuthSyncResult {
  currentUser: AuthIdentity | null;
  accessToken: string | null;
  authLoading: boolean;
  authMessage: string | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AuthIdentity | null>>;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setAuthMessage: React.Dispatch<React.SetStateAction<string | null>>;
  getAuthHeaders: () => { Authorization: string } | null;
}

export function useAuthSync(supabase: SupabaseClient | null): AuthSyncResult {
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setCurrentUser((prev) => {
        const nextUser = mapUser(data.session?.user ?? null);
        if (!nextUser) return null;
        if (prev && prev.id === nextUser.id) {
          return { ...nextUser, name: prev.name, handle: prev.handle, avatarUrl: prev.avatarUrl, bio: prev.bio };
        }
        return nextUser;
      });
      setAccessToken(data.session?.access_token ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      setCurrentUser((prev) => {
        const nextUser = mapUser(session?.user ?? null);
        if (!nextUser) return null;
        if (prev && prev.id === nextUser.id) {
          return { ...nextUser, name: prev.name, handle: prev.handle, avatarUrl: prev.avatarUrl, bio: prev.bio };
        }
        return nextUser;
      });
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function getAuthHeaders(): { Authorization: string } | null {
    if (!accessToken) {
      return null;
    }

    return { Authorization: `Bearer ${accessToken}` };
  }

  return {
    currentUser,
    accessToken,
    authLoading,
    authMessage,
    setCurrentUser,
    setAccessToken,
    setAuthLoading,
    setAuthMessage,
    getAuthHeaders
  };
}
