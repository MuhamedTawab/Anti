"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "@/lib/types";

export interface PresenceMember extends AuthIdentity {
  roomId: string | null;
  serverId: string;
}

export interface PresenceResult {
  presenceMembers: Record<string, PresenceMember>;
  setPresenceMembers: React.Dispatch<React.SetStateAction<Record<string, PresenceMember>>>;
  presenceChannelRef: React.MutableRefObject<RealtimeChannel | null>;
}

export function usePresence(
  supabase: SupabaseClient | null,
  currentUser: AuthIdentity | null,
  activeServerId: string,
  joinedVoiceRoomId: string | null
): PresenceResult {
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [presenceMembers, setPresenceMembers] = useState<Record<string, PresenceMember>>({});

  // Subscribe to presence channel
  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase.channel("blaze-presence", {
      config: {
        presence: {
          key: currentUser.id
        }
      }
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          id: string;
          email: string;
          name: string;
          handle: string;
          avatarUrl: string | null;
          roomId: string | null;
          serverId: string;
        }>();
        const flattened: Record<string, PresenceMember> = {};

        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            flattened[entry.id] = entry;
          });
        });

        setPresenceMembers(flattened);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current?.topic === channel.topic) {
        presenceChannelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, supabase]);

  // Track current user's presence state (server + room)
  useEffect(() => {
    if (!presenceChannelRef.current || !currentUser) {
      return;
    }

    void presenceChannelRef.current.track({
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      handle: currentUser.handle,
      avatarUrl: currentUser.avatarUrl ?? null,
      roomId: joinedVoiceRoomId,
      serverId: activeServerId
    });
  }, [
    activeServerId,
    currentUser?.avatarUrl,
    currentUser?.email,
    currentUser?.handle,
    currentUser?.id,
    currentUser?.name,
    joinedVoiceRoomId
  ]);

  return { presenceMembers, setPresenceMembers, presenceChannelRef };
}
