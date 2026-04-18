"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity, Message } from "@/lib/types";

function mergeMessage(messages: Message[], nextMessage: Message) {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage];
}

export interface RealtimeChatResult {
  realtimeChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  typingMembers: Record<string, { name: string; channelId: string; expiresAt: number }>;
  setDataMessages: (
    updater: (current: Record<string, Message[]>) => Record<string, Message[]>
  ) => void;
}

export function useRealtimeChat(
  supabase: SupabaseClient | null,
  currentUser: AuthIdentity | null,
  activeChatKey: string,
  viewMode: "channel" | "dm",
  setData: React.Dispatch<
    React.SetStateAction<{ messages: Record<string, Message[]>; [key: string]: unknown }>
  >,
  playUiSound: (kind: "send" | "receive" | "success" | "error" | "join" | "leave") => void
): {
  realtimeChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  typingMembers: Record<string, { name: string; channelId: string; expiresAt: number }>;
} {
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const [typingMembers, setTypingMembers] = useState<
    Record<string, { name: string; channelId: string; expiresAt: number }>
  >({});

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase.channel(`blaze-room:${activeChatKey}`);

    if (viewMode === "channel") {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChatKey}`
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            channel_id: string;
            author: string;
            handle: string;
            body: string;
            timestamp: string;
          };

          const nextMessage: Message = {
            id: row.id,
            channelId: row.channel_id,
            author: row.author,
            handle: row.handle,
            body: row.body,
            timestamp: row.timestamp
          };

          setData((current) => ({
            ...current,
            messages: {
              ...current.messages,
              [activeChatKey]: mergeMessage(current.messages[activeChatKey] ?? [], nextMessage)
            }
          }));
        }
      );
    }

    channel
      .on("broadcast", { event: "message" }, (payload) => {
        const nextMessage = (payload.payload as { message?: Message }).message;

        if (!nextMessage) {
          return;
        }

        if (nextMessage.author !== currentUser.name || nextMessage.handle !== currentUser.handle) {
          playUiSound("receive");
        }

        setData((current) => ({
          ...current,
          messages: {
            ...current.messages,
            [activeChatKey]: mergeMessage(current.messages[activeChatKey] ?? [], nextMessage)
          }
        }));
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const nextTyping = (payload.payload as {
          userId?: string;
          name?: string;
          channelId?: string;
        }) ?? {};

        if (
          !nextTyping.userId ||
          !nextTyping.name ||
          !nextTyping.channelId ||
          nextTyping.userId === currentUser.id
        ) {
          return;
        }

        setTypingMembers((current) => ({
          ...current,
          [nextTyping.userId!]: {
            name: nextTyping.name!,
            channelId: nextTyping.channelId!,
            expiresAt: Date.now() + 2200
          }
        }));
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current?.topic === channel.topic) {
        realtimeChannelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [activeChatKey, currentUser, supabase, viewMode]);

  // Prune expired typing indicators
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const interval = window.setInterval(() => {
      setTypingMembers((current) => {
        const next = Object.fromEntries(
          Object.entries(current).filter(([, member]) => member.expiresAt > Date.now())
        );

        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 700);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentUser]);

  return { realtimeChannelRef, typingMembers };
}
