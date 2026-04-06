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
  authMode: "signin" | "signup" | "forgot" | "reset";
  authEmail: string;
  authPassword: string;
  changePasswordValue: string;
  authLoading: boolean;
  authMessage: string | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AuthIdentity | null>>;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup" | "forgot" | "reset">>;
  setAuthEmail: React.Dispatch<React.SetStateAction<string>>;
  setAuthPassword: React.Dispatch<React.SetStateAction<string>>;
  setChangePasswordValue: React.Dispatch<React.SetStateAction<string>>;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setAuthMessage: React.Dispatch<React.SetStateAction<string | null>>;
  getAuthHeaders: () => { Authorization: string } | null;
}

export function useAuthSync(supabase: SupabaseClient | null): AuthSyncResult {
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [changePasswordValue, setChangePasswordValue] = useState("");
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

      setCurrentUser(mapUser(data.session?.user ?? null));
      setAccessToken(data.session?.access_token ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      setCurrentUser(mapUser(session?.user ?? null));
      setAccessToken(session?.access_token ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
        setAuthMessage("Recovery session detected. Set your new password now.");
      }
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
    authMode,
    authEmail,
    authPassword,
    changePasswordValue,
    authLoading,
    authMessage,
    setCurrentUser,
    setAccessToken,
    setAuthMode,
    setAuthEmail,
    setAuthPassword,
    setChangePasswordValue,
    setAuthLoading,
    setAuthMessage,
    getAuthHeaders
  };
}
