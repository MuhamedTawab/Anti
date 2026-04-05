"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";

import { ChannelList } from "@/components/channel-list";
import { ChatPanel } from "@/components/chat-panel";
import { RoadmapCard } from "@/components/roadmap-card";
import { ServerRail } from "@/components/server-rail";
import { VoicePanel } from "@/components/voice-panel";
import { AuthPanel } from "@/components/auth-panel";
import { SocialPanel } from "@/components/social-panel";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  AuthIdentity,
  BootstrapPayload,
  Channel,
  DirectThread,
  Message,
  Server,
  SocialPayload
} from "@/lib/types";

function getInitialServer(data: BootstrapPayload): Server {
  return data.servers[0];
}

function getInitialTextChannel(server: Server): Channel {
  return server.channels.find((channel) => channel.kind === "text") ?? server.channels[0];
}

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

function mergeMessage(messages: Message[], nextMessage: Message) {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage];
}

function replaceMessage(messages: Message[], previousId: string, nextMessage: Message) {
  const filtered = messages.filter((message) => message.id !== previousId);
  return mergeMessage(filtered, nextMessage);
}

export function AppShell({ initialData }: { initialData: BootstrapPayload }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const voiceSignalChannelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const [data, setData] = useState(initialData);
  const [activeServerId, setActiveServerId] = useState(getInitialServer(initialData).id);
  const [activeTextChannelId, setActiveTextChannelId] = useState(
    getInitialTextChannel(getInitialServer(initialData)).id
  );
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(
    getInitialServer(initialData).channels.find((channel) => channel.kind === "voice")?.id ?? ""
  );
  const [composerValue, setComposerValue] = useState("");
  const [joinedVoiceRoomId, setJoinedVoiceRoomId] = useState<string | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [changePasswordValue, setChangePasswordValue] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [presenceMembers, setPresenceMembers] = useState<Record<string, AuthIdentity & { roomId: string | null; serverId: string }>>({});
  const [typingMembers, setTypingMembers] = useState<Record<string, { name: string; channelId: string; expiresAt: number }>>({});
  const [socialData, setSocialData] = useState<SocialPayload>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    directThreads: []
  });
  const [friendEmail, setFriendEmail] = useState("");
  const [viewMode, setViewMode] = useState<"channel" | "dm">("channel");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getAuthHeaders() {
    if (!currentUser || !accessToken) {
      return null;
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      "x-nightlink-user-id": currentUser.id,
      "x-nightlink-user-email": currentUser.email,
      "x-nightlink-user-name": currentUser.name,
      "x-nightlink-user-handle": currentUser.handle
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function refreshBootstrap() {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const nextData = (await response.json()) as BootstrapPayload;

      if (!cancelled) {
        setData(nextData);
      }
    }

    refreshBootstrap().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!currentUser || !accessToken) {
      return;
    }

    async function syncAndLoadSocial() {
      const headers = getAuthHeaders();

      if (!headers) {
        return;
      }

      await fetch("/api/me/profile", {
        method: "POST",
        headers
      });

      const response = await fetch("/api/social", {
        headers,
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const nextSocial = (await response.json()) as SocialPayload;
      setSocialData(nextSocial);
      if (!activeThreadId && nextSocial.directThreads[0]) {
        setActiveThreadId(nextSocial.directThreads[0].id);
      }
    }

    void syncAndLoadSocial();
  }, [accessToken, activeThreadId, currentUser]);

  const activeThread = useMemo<DirectThread | null>(
    () => socialData.directThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, socialData.directThreads]
  );

  const activeChatKey = viewMode === "dm" && activeThread ? activeThread.id : activeTextChannelId;

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase
      .channel(`nightlink-room:${activeChatKey}`);

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
        }) ?? { };

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

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase.channel("nightlink-presence", {
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
          roomId: string | null;
          serverId: string;
        }>();
        const flattened: Record<
          string,
          AuthIdentity & { roomId: string | null; serverId: string }
        > = {};

        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            flattened[entry.id] = entry;
          });
        });

        setPresenceMembers(flattened);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        await channel.track({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          handle: currentUser.handle,
          roomId: joinedVoiceRoomId,
          serverId: activeServerId
        });
      });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current?.topic === channel.topic) {
        presenceChannelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [activeServerId, currentUser, joinedVoiceRoomId, supabase]);

  useEffect(() => {
    if (!supabase || !currentUser || !joinedVoiceRoomId) {
      return;
    }

    const channel = supabase
      .channel(`nightlink-voice:${joinedVoiceRoomId}`)
      .on("broadcast", { event: "join" }, async (payload) => {
        const next = payload.payload as { userId?: string };

        if (!next.userId || next.userId === currentUser.id) {
          return;
        }

        const peer = createPeerConnection(next.userId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendVoiceSignal({
          to: next.userId,
          from: currentUser.id,
          description: offer
        });
      })
      .on("broadcast", { event: "signal" }, async (payload) => {
        const signal = payload.payload as {
          to?: string;
          from?: string;
          description?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };

        if (!signal.to || !signal.from || signal.to !== currentUser.id) {
          return;
        }

        const peer = createPeerConnection(signal.from);

        if (signal.description) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.description));

          if (signal.description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendVoiceSignal({
              to: signal.from,
              from: currentUser.id,
              description: answer
            });
          }
        }

        if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => null);
        }
      })
      .on("broadcast", { event: "leave" }, (payload) => {
        const next = payload.payload as { userId?: string };

        if (!next.userId) {
          return;
        }

        cleanupPeer(next.userId);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        await channel.send({
          type: "broadcast",
          event: "join",
          payload: {
            userId: currentUser.id
          }
        });
      });

    voiceSignalChannelRef.current = channel;

    return () => {
      if (voiceSignalChannelRef.current?.topic === channel.topic) {
        void channel.send({
          type: "broadcast",
          event: "leave",
          payload: {
            userId: currentUser.id
          }
        });
        voiceSignalChannelRef.current = null;
      }
      cleanupVoiceSession();
      void supabase.removeChannel(channel);
    };
  }, [currentUser, joinedVoiceRoomId, supabase]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const interval = window.setInterval(() => {
      if (viewMode === "channel") {
        void loadChannelMessages(activeChatKey);
      } else {
        void loadDirectMessages(activeChatKey);
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeChatKey, currentUser, viewMode]);

  const activeServer = useMemo(
    () => data.servers.find((server) => server.id === activeServerId) ?? data.servers[0],
    [activeServerId, data.servers]
  );

  const activeTextChannel = useMemo(
    () =>
      activeServer.channels.find((channel) => channel.id === activeTextChannelId) ??
      activeServer.channels.find((channel) => channel.kind === "text") ??
      activeServer.channels[0],
    [activeServer, activeTextChannelId]
  );

  const activeVoiceChannel = useMemo(
    () =>
      activeServer.channels.find((channel) => channel.id === activeVoiceChannelId) ??
      activeServer.channels.find((channel) => channel.kind === "voice") ??
      null,
    [activeServer, activeVoiceChannelId]
  );

  const activeMessages = data.messages[activeTextChannel.id] ?? [];
  const displayedMessages =
    viewMode === "dm" && activeThread ? data.messages[activeThread.id] ?? [] : activeMessages;
  const activeMembers = activeVoiceChannel
    ? Object.values(presenceMembers)
        .filter(
          (member) =>
            member.serverId === activeServer.id && member.roomId === activeVoiceChannel.id
        )
        .map((member) => ({
          id: member.id,
          name: member.name,
          role: "Live member",
          status: "online" as const
        }))
    : [];
  const onlineMembers = Object.values(presenceMembers)
    .filter((member) => member.serverId === activeServer.id)
    .map((member) => ({
      id: member.id,
      name: member.name,
      role:
        member.roomId
          ? activeServer.channels.find((channel) => channel.id === member.roomId)?.name ?? "In voice"
          : "Online",
      status: "online" as const
    }));
  const onlineFriendIds = Object.keys(presenceMembers);
  const activeTypingMembers = Object.values(typingMembers)
    .filter((member) => member.channelId === activeChatKey && member.expiresAt > Date.now())
    .map((member) => member.name);

  function getRtcConfiguration(): RTCConfiguration {
    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };
  }

  function cleanupPeer(remoteUserId: string) {
    peerConnectionsRef.current[remoteUserId]?.close();
    delete peerConnectionsRef.current[remoteUserId];
    remoteAudioRef.current[remoteUserId]?.pause();
    delete remoteAudioRef.current[remoteUserId];
  }

  function cleanupVoiceSession() {
    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setIsMuted(false);
  }

  async function sendVoiceSignal(payload: Record<string, unknown>) {
    await voiceSignalChannelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload
    });
  }

  async function leaveVoiceRoom(nextServerId = activeServerId) {
    if (voiceSignalChannelRef.current && currentUser) {
      await voiceSignalChannelRef.current.send({
        type: "broadcast",
        event: "leave",
        payload: {
          userId: currentUser.id
        }
      });
    }

    cleanupVoiceSession();

    if (voiceSignalChannelRef.current && supabase) {
      void supabase.removeChannel(voiceSignalChannelRef.current);
      voiceSignalChannelRef.current = null;
    }

    if (presenceChannelRef.current && currentUser) {
      await presenceChannelRef.current.track({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        handle: currentUser.handle,
        roomId: null,
        serverId: nextServerId
      });
    }

    setJoinedVoiceRoomId(null);
    setVoiceParticipants(null);
    setIsVoiceConnecting(false);
    setIsMuted(false);
  }

  function createPeerConnection(remoteUserId: string) {
    const existing = peerConnectionsRef.current[remoteUserId];

    if (existing) {
      return existing;
    }

    const peer = new RTCPeerConnection(getRtcConfiguration());

    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        peer.addTrack(track, localStreamRef.current);
      }
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate || !currentUser) {
        return;
      }

      void sendVoiceSignal({
        to: remoteUserId,
        from: currentUser.id,
        candidate: event.candidate.toJSON()
      });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;

      if (!stream) {
        return;
      }

      const existingAudio = remoteAudioRef.current[remoteUserId];
      if (existingAudio) {
        existingAudio.srcObject = stream;
        void existingAudio.play().catch(() => null);
        return;
      }

      const audio = new Audio();
      audio.autoplay = true;
      audio.srcObject = stream;
      remoteAudioRef.current[remoteUserId] = audio;
      void audio.play().catch(() => null);
    };

    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        cleanupPeer(remoteUserId);
      }
    };

    peerConnectionsRef.current[remoteUserId] = peer;
    return peer;
  }

  async function handleServerSelect(serverId: string) {
    const nextServer =
      data.servers.find((server) => server.id === serverId) ?? getInitialServer(data);
    const nextTextChannel = getInitialTextChannel(nextServer);
    const nextVoiceChannel =
      nextServer.channels.find((channel) => channel.kind === "voice")?.id ?? "";

    if (joinedVoiceRoomId) {
      await leaveVoiceRoom(nextServer.id);
    }

    setActiveServerId(nextServer.id);
    setActiveTextChannelId(nextTextChannel.id);
    setActiveVoiceChannelId(nextVoiceChannel);
    setViewMode("channel");
    setError(null);
  }

  async function loadChannelMessages(channelId: string) {
    const response = await fetch(`/api/channels/${channelId}/messages`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { messages: Message[] };

    setData((current) => ({
      ...current,
      messages: {
        ...current.messages,
        [channelId]: payload.messages
      }
    }));
  }

  async function loadDirectMessages(threadId: string) {
    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    const response = await fetch(`/api/dm/${threadId}/messages`, {
      cache: "no-store",
      headers
    });
    const payload = (await response.json()) as { messages: Message[] };

    setData((current) => ({
      ...current,
      messages: {
        ...current.messages,
        [threadId]: payload.messages
      }
    }));
  }

  function handleTextChannelSelect(channelId: string) {
    setActiveTextChannelId(channelId);
    setViewMode("channel");
    setError(null);

    startTransition(() => {
      loadChannelMessages(channelId).catch(() => {
        setError("Could not load channel messages.");
      });
    });
  }

  async function handleVoiceChannelSelect(channelId: string) {
    if (joinedVoiceRoomId) {
      await leaveVoiceRoom();
    }

    setActiveVoiceChannelId(channelId);
    setError(null);
  }

  function handleOpenThread(threadId: string) {
    setActiveThreadId(threadId);
    setViewMode("dm");
    setError(null);
    startTransition(() => {
      loadDirectMessages(threadId).catch(() => {
        setError("Could not load private messages.");
      });
    });
  }

  async function handleSendMessage() {
    const body = composerValue.trim();

    if (!body || !currentUser) {
      return;
    }

    if (!accessToken) {
      setError("Your session is not ready yet. Try again in a second.");
      return;
    }

    const activeTargetId = activeChatKey;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      channelId: activeTargetId,
      author: currentUser.name,
      handle: currentUser.handle,
      body,
      timestamp: "sending...",
      optimistic: true
    };

    setComposerValue("");
    setError(null);
    setIsSending(true);
    setData((current) => ({
      ...current,
      messages: {
        ...current.messages,
        [activeTargetId]: mergeMessage(current.messages[activeTargetId] ?? [], optimisticMessage)
      }
    }));

    try {
      const authHeaders = getAuthHeaders();

      if (!authHeaders) {
        throw new Error("Your session is not ready yet. Try again in a second.");
      }

      const headers = {
        "Content-Type": "application/json",
        ...authHeaders
      };
      const response = await fetch(
        viewMode === "dm"
          ? `/api/dm/${activeTargetId}/messages`
          : `/api/channels/${activeTargetId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ body })
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: Message; error?: string }
        | null;

      const nextMessage = payload?.message;

      if (!response.ok || !nextMessage) {
        setComposerValue(body);
        setError(payload?.error ?? "Message failed to send.");
        setData((current) => ({
          ...current,
          messages: {
            ...current.messages,
            [activeTargetId]: (current.messages[activeTargetId] ?? []).filter(
              (message) => message.id !== optimisticId
            )
          }
        }));
        return;
      }

      setData((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [activeTargetId]: replaceMessage(
            current.messages[activeTargetId] ?? [],
            optimisticId,
            nextMessage
          )
        }
      }));

      await realtimeChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: {
          message: nextMessage
        }
      });

      if (viewMode === "channel") {
        void loadChannelMessages(activeTargetId);
      } else {
        void loadDirectMessages(activeTargetId);
      }
    } catch (nextError) {
      setComposerValue(body);
      setError(nextError instanceof Error ? nextError.message : "Message failed to send.");
      setData((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [activeTargetId]: (current.messages[activeTargetId] ?? []).filter(
            (message) => message.id !== optimisticId
          )
        }
      }));
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerChange(value: string) {
    setComposerValue(value);

    if (!value.trim() || !currentUser || !realtimeChannelRef.current) {
      return;
    }

    void realtimeChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUser.id,
        name: currentUser.name,
        channelId: activeChatKey
      }
    });
  }

  async function handleSendFriendRequest() {
    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ email: friendEmail })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not send friend request.");
      return;
    }

    setFriendEmail("");
    const socialResponse = await fetch("/api/social", {
      headers,
      cache: "no-store"
    });
    if (socialResponse.ok) {
      setSocialData((await socialResponse.json()) as SocialPayload);
    }
  }

  async function handleRespondFriendRequest(requestId: string, action: "accept" | "decline") {
    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    const response = await fetch(`/api/friends/${requestId}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ action })
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; threadId?: string | null }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not update request.");
      return;
    }

    const socialResponse = await fetch("/api/social", {
      headers,
      cache: "no-store"
    });
    if (socialResponse.ok) {
      const nextSocial = (await socialResponse.json()) as SocialPayload;
      setSocialData(nextSocial);
      if (action === "accept") {
        const acceptedThread =
          nextSocial.directThreads.find((thread) => thread.id === payload?.threadId) ??
          nextSocial.directThreads[nextSocial.directThreads.length - 1];

        if (acceptedThread) {
          setActiveThreadId(acceptedThread.id);
          setViewMode("dm");
          void loadDirectMessages(acceptedThread.id);
        }
      }
    }
  }

  async function handleVoiceToggle() {
    if (!activeVoiceChannel) {
      return;
    }

    if (joinedVoiceRoomId === activeVoiceChannel.id) {
      await leaveVoiceRoom();
      return;
    }

    setError(null);
    setIsVoiceConnecting(true);

    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        },
        video: false
      });

      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roomId: activeVoiceChannel.id })
      });

      if (!response.ok) {
        setError("Voice room could not connect.");
        cleanupVoiceSession();
        return;
      }

      const payload = (await response.json()) as { roomId: string; participants: number };
      setJoinedVoiceRoomId(payload.roomId);
      setVoiceParticipants(payload.participants);
      setIsMuted(false);
      if (presenceChannelRef.current && currentUser) {
        await presenceChannelRef.current.track({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          handle: currentUser.handle,
          roomId: payload.roomId,
          serverId: activeServerId
        });
      }
    } catch {
      setError("Microphone access failed or voice could not start.");
      cleanupVoiceSession();
    } finally {
      setIsVoiceConnecting(false);
    }
  }

  function handleToggleMute() {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];

    if (!audioTracks.length) {
      return;
    }

    const shouldMute = audioTracks.some((track) => track.enabled);

    audioTracks.forEach((track) => {
      track.enabled = !shouldMute;
    });

    setIsMuted(shouldMute);
  }

  async function handleAuthSubmit() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured for browser auth.");
      return;
    }

    const email = authEmail.trim();
    const password = authPassword.trim();

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      if (authMode === "forgot") {
        if (!email) {
          setAuthMessage("Email is required.");
          return;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });

        if (resetError) {
          setAuthMessage(resetError.message);
          return;
        }

        setAuthMessage("Reset link sent. Check your email inbox.");
        return;
      }

      if (!password) {
        setAuthMessage("Password is required.");
        return;
      }

      if (authMode === "reset") {
        const { error: updateError } = await supabase.auth.updateUser({
          password
        });

        if (updateError) {
          setAuthMessage(updateError.message);
          return;
        }

        setAuthPassword("");
        setAuthMode("signin");
        setAuthMessage("Password changed. You can continue into Nightlink.");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (authMode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setAuthMessage(signInError.message);
          return;
        }

        setAuthPassword("");
        setAuthMessage("Signed in. Your next messages will use your account.");
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        setAuthMessage(signUpError.message);
        return;
      }

      setAuthPassword("");
      setAuthMode("signin");
      setAuthMessage(
        signUpData.session
          ? "Account created and signed in."
          : "Account created. Check your email if confirmation is required, then sign in."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured for browser auth.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setAuthMessage(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured for browser auth.");
      return;
    }

    const nextPassword = changePasswordValue.trim();

    if (!nextPassword) {
      setAuthMessage("Enter a new password first.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: nextPassword
      });

      if (updateError) {
        setAuthMessage(updateError.message);
        return;
      }

      setChangePasswordValue("");
      setAuthMessage("Password updated.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await leaveVoiceRoom();
    await supabase.auth.signOut();
    setPresenceMembers({});
    setSocialData({
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      directThreads: []
    });
    setAuthMode("signin");
    setAuthMessage("Signed out.");
  }

  useEffect(() => {
    return () => {
      cleanupVoiceSession();
    };
  }, []);

  if (!currentUser || authMode === "reset") {
    return (
      <AuthPanel
        mode={authMode}
        email={authEmail}
        password={authPassword}
        changePassword={changePasswordValue}
        currentUser={currentUser}
        loading={authLoading}
        message={authMessage}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onChangePasswordValueChange={setChangePasswordValue}
        onSubmit={handleAuthSubmit}
        onGoogleSignIn={handleGoogleSignIn}
        onChangePassword={handleChangePassword}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.025] to-transparent shadow-panel">
        <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-ember/80">
              Nightlink
            </p>
            <h1 className="font-display text-4xl uppercase tracking-[0.08em] text-white lg:text-5xl">
              Dark. Fast. Built for squads.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 lg:text-base">
              A minimal chat and voice space with sharper energy, faster reads, and a gaming-first
              mood instead of a corporate dashboard feel.
            </p>
          </div>
          <div className="flex gap-3 text-xs uppercase tracking-[0.28em] text-white/45">
            <span className="rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-ember">
              Ranked
            </span>
            <span className="rounded-full border border-sea/20 bg-sea/10 px-4 py-2 text-sea">
              Voice Live
            </span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {error}
        </div>
      ) : null}

      <AuthPanel
        mode={authMode}
        email={authEmail}
        password={authPassword}
        changePassword={changePasswordValue}
        currentUser={currentUser}
        loading={authLoading}
        message={authMessage}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onChangePasswordValueChange={setChangePasswordValue}
        onSubmit={handleAuthSubmit}
        onGoogleSignIn={handleGoogleSignIn}
        onChangePassword={handleChangePassword}
        onSignOut={handleSignOut}
      />

      <section className="grid gap-4 xl:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <ServerRail items={data.servers} activeId={activeServer.id} onSelect={handleServerSelect} />
        <ChannelList
          server={activeServer}
          activeChannelId={activeTextChannel.id}
          activeVoiceChannelId={activeVoiceChannel?.id ?? ""}
          onlineMembers={onlineMembers}
          onTextSelect={handleTextChannelSelect}
          onVoiceSelect={handleVoiceChannelSelect}
        />
        <ChatPanel
          channelName={viewMode === "dm" && activeThread ? activeThread.friendName : activeTextChannel.name}
          channelPrefix={viewMode === "dm" ? "@" : "#"}
          items={displayedMessages}
          composerValue={composerValue}
          pending={isPending || isSending}
          canSend={Boolean(currentUser)}
          typingMembers={activeTypingMembers}
          onComposerChange={handleComposerChange}
          onSend={handleSendMessage}
        />
        <VoicePanel
          roomName={activeVoiceChannel?.name ?? "No Room"}
          members={activeMembers}
          joined={joinedVoiceRoomId === activeVoiceChannel?.id}
          muted={isMuted}
          connecting={isVoiceConnecting}
          participants={activeMembers.length}
          onToggleJoin={handleVoiceToggle}
          onToggleMute={handleToggleMute}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel">
          <SocialPanel
            friends={socialData.friends}
            incomingRequests={socialData.incomingRequests}
            outgoingRequests={socialData.outgoingRequests}
            directThreads={socialData.directThreads}
            friendEmail={friendEmail}
            activeThreadId={activeThreadId}
            onlineFriendIds={onlineFriendIds}
            onFriendEmailChange={setFriendEmail}
            onSendRequest={handleSendFriendRequest}
            onRespondRequest={handleRespondFriendRequest}
            onOpenThread={handleOpenThread}
          />
        </div>
        <RoadmapCard />
      </section>
    </div>
  );
}
