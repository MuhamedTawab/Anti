"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";

import { ChannelList } from "@/components/channel-list";
import { ChatPanel } from "@/components/chat-panel";
import { PromptModal } from "@/components/prompt-modal";
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
  return (
    data.servers[0] ?? {
      id: "empty",
      name: "Nightlink",
      initials: "NL",
      accent: "from-[#ff3b5f] to-[#ff8a5b]",
      channels: []
    }
  );
}

function getInitialTextChannel(server: Server): Channel {
  return (
    server.channels.find((channel) => channel.kind === "text") ??
    server.channels[0] ?? {
      id: "empty-text",
      name: "general",
      kind: "text"
    }
  );
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
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex !== -1) {
    const existing = messages[existingIndex];
    const newArray = [...messages];
    newArray[existingIndex] = {
      ...existing,
      ...nextMessage,
      authorAvatarUrl: nextMessage.authorAvatarUrl ?? existing.authorAvatarUrl,
      author: nextMessage.author ?? existing.author
    };
    return newArray;
  }
  return [...messages, nextMessage];
}

function replaceMessage(messages: Message[], previousId: string, nextMessage: Message) {
  const filtered = messages.filter((message) => message.id !== previousId);
  return mergeMessage(filtered, nextMessage);
}

function profileSnapshotKey(profile: AuthIdentity | null) {
  if (!profile) {
    return null;
  }

  return JSON.stringify({
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl ?? "",
    bio: profile.bio ?? ""
  });
}

import { useAuthSync } from "@/lib/hooks/use-auth-sync";
import { useWorkspaceData } from "@/lib/hooks/use-workspace-data";
import { useRealtimeChat } from "@/lib/hooks/use-realtime-chat";
import { usePresence } from "@/lib/hooks/use-presence";
import { useVoiceRoom } from "@/lib/hooks/use-voice-room";
import { useUiSounds } from "@/lib/hooks/use-ui-sounds";

export function AppShell({ initialData }: { initialData: BootstrapPayload }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [composerValue, setComposerValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"channel" | "dm">("channel");
  const [isSending, setIsSending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false);
  const [joinInviteModalOpen, setJoinInviteModalOpen] = useState(false);

  const { playUiSound, getAudioContext } = useUiSounds();

  const {
    currentUser,
    accessToken,
    authLoading,
    authMessage,
    setCurrentUser,
    setAuthMessage,
    setAuthLoading,
    getAuthHeaders
  } = useAuthSync(supabase);

  const {
    data,
    setData,
    activeServerId,
    setActiveServerId,
    activeTextChannelId,
    setActiveTextChannelId,
    activeVoiceChannelId,
    setActiveVoiceChannelId,
    socialData,
    setSocialData,
    activeThreadId,
    setActiveThreadId,
    profileName,
    profileHandle,
    profileAvatarUrl,
    profileBio,
    setProfileName,
    setProfileHandle,
    setProfileAvatarUrl,
    setProfileBio,
    profileDraftDirtyRef,
    lastProfileSyncRef
  } = useWorkspaceData(initialData, currentUser, accessToken, getAuthHeaders, setCurrentUser);

  const activeThread = useMemo(
    () => socialData.directThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, socialData.directThreads]
  );
  const activeChatKey = viewMode === "dm" && activeThread ? activeThread.id : activeTextChannelId;

  const { realtimeChannelRef, typingMembers } = useRealtimeChat(
    supabase,
    currentUser,
    activeChatKey,
    viewMode,
    setData as any,
    playUiSound
  );

  const {
    joinedVoiceRoomId,
    isVoiceConnecting,
    isMuted,
    isDeafened,
    isPushToTalk,
    isPushToTalkActive,
    voiceConnectionStatus,
    outputVolume,
    signalLevels,
    participantLevels,
    setIsMuted,
    setIsDeafened,
    setIsPushToTalk,
    setOutputVolume,
    leaveVoiceRoom,
    handleVoiceToggle,
    pushToTalkKey,
    setPushToTalkKey
  } = useVoiceRoom(supabase, currentUser, activeServerId, playUiSound, getAudioContext, setError, async (payload, channel) => {
    await channel?.send({ type: "broadcast", event: "signal", payload });
  });

  const { presenceMembers, setPresenceMembers } = usePresence(supabase, currentUser, activeServerId, joinedVoiceRoomId);

  const activeServer = useMemo(() => data.servers.find((s) => s.id === activeServerId) ?? data.servers[0] ?? null, [activeServerId, data.servers]);
  const activeTextChannel = useMemo(() => activeServer?.channels.find((c) => c.id === activeTextChannelId) ?? activeServer?.channels.find((c) => c.kind === "text") ?? activeServer?.channels[0] ?? null, [activeServer, activeTextChannelId]);
  const activeVoiceChannel = useMemo(() => activeServer?.channels.find((c) => c.id === activeVoiceChannelId) ?? activeServer?.channels.find((c) => c.kind === "voice") ?? null, [activeServer, activeVoiceChannelId]);

  const activeMessages = activeTextChannel ? data.messages[activeTextChannel.id] ?? [] : [];
  const displayedMessages = viewMode === "dm" && activeThread ? data.messages[activeThread.id] ?? [] : activeMessages;
  const speakingUserIds = Object.entries(participantLevels).filter(([, lvl]) => lvl > 0.06).map(([userId]) => userId);

  const activeMembers = activeVoiceChannel ? Object.values(presenceMembers).filter((m) => m.serverId === activeServer?.id && m.roomId === activeVoiceChannel.id).map((m) => ({ id: m.id, name: m.name, role: speakingUserIds.includes(m.id) ? "Speaking now" : "Live member", status: "online" as const, avatarUrl: m.avatarUrl ?? null })) : [];
  const onlineMembers = Object.values(presenceMembers).filter((m) => m.serverId === activeServer?.id).map((m) => ({ id: m.id, name: m.name, role: m.roomId ? activeServer?.channels.find((c) => c.id === m.roomId)?.name ?? "In voice" : "Online", status: "online" as const, avatarUrl: m.avatarUrl ?? null }));
  const onlineFriendIds = Object.keys(presenceMembers);
  const activeTypingMembers = Object.values(typingMembers).filter((m) => m.channelId === activeChatKey && m.expiresAt > Date.now()).map((m) => m.name);

  // Unread counts — purely client-side, no polling or API calls.
  // We store the last-seen message count per channel in a ref, and
  // the delta becomes the unread badge shown in the sidebar.
  const seenCountRef = useRef<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Reset unread for the channel the user is currently viewing
    if (!activeChatKey) return;
    seenCountRef.current[activeChatKey] = (data.messages[activeChatKey] ?? []).length;
    setUnreadCounts((prev) => ({ ...prev, [activeChatKey]: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatKey]);

  useEffect(() => {
    // For every channel except the active one, compute how many new
    // messages arrived since the user last viewed it.
    const next: Record<string, number> = {};
    for (const [channelId, messages] of Object.entries(data.messages)) {
      if (channelId === activeChatKey) continue;
      const seen = seenCountRef.current[channelId] ?? messages.length;
      const newCount = Math.max(0, messages.length - seen);
      if (newCount > 0) {
        next[channelId] = newCount;
      }
    }
    if (Object.keys(next).length > 0) {
      setUnreadCounts((prev) => ({ ...prev, ...next }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.messages]);

  async function handleServerSelect(serverId: string) {
    const nextServer =
      data.servers.find((server) => server.id === serverId) ?? (data.servers[0] ?? null);

    if (!nextServer) {
      return;
    }

    const nextTextChannel = getInitialTextChannel(nextServer);
    const nextVoiceChannel =
      nextServer.channels.find((channel) => channel.kind === "voice")?.id ?? "";

    if (joinedVoiceRoomId) {
      await leaveVoiceRoom(nextServer.id);
    }

    setActiveServerId(nextServer.id);
    setActiveTextChannelId(nextTextChannel.id);
    setActiveVoiceChannelId(nextVoiceChannel);
    setActiveInviteCode(null);
    setViewMode("channel");
    setError(null);
  }

  async function loadChannelMessages(channelId: string) {
    const headers = getAuthHeaders() ?? undefined;
    const response = await fetch(`/api/channels/${channelId}/messages`, {
      cache: "no-store",
      headers: headers ?? undefined
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
    const nextAttachmentUrl = attachmentUrl.trim();

    if ((!body && !nextAttachmentUrl) || !currentUser) {
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
      attachments: nextAttachmentUrl ? [{ id: `${optimisticId}-attachment`, ...{ kind: /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(nextAttachmentUrl) ? "image" : "link", url: nextAttachmentUrl, name: decodeURIComponent((nextAttachmentUrl.split("?")[0] ?? nextAttachmentUrl).split("/").pop() || "attachment") } }] : [],
      timestamp: "sending...",
      optimistic: true,
      authorAvatarUrl: currentUser.avatarUrl ?? null,
      canModerate: true
    };

    setComposerValue("");
    setAttachmentUrl("");
    setAttachmentOpen(false);
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
          body: JSON.stringify({ body, attachmentUrl: nextAttachmentUrl || null })
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

      // No extra fetch needed — realtime broadcast already delivers the message to all clients.
      playUiSound("send");
    } catch (nextError) {
      setComposerValue(body);
      setError(nextError instanceof Error ? nextError.message : "Message failed to send.");
      playUiSound("error");
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

  // Ref to hold the typing debounce timer.
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleComposerChange(value: string) {
    setComposerValue(value);

    if (!value.trim() || !currentUser || !realtimeChannelRef.current) {
      return;
    }

    // Debounce: only broadcast typing once per 300 ms to avoid flooding the channel.
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(() => {
      void realtimeChannelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser.id,
          name: currentUser.name,
          channelId: activeChatKey
        }
      });
    }, 300);
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
      playUiSound("error");
      return;
    }

    setFriendEmail("");
    playUiSound("success");
    const socialResponse = await fetch("/api/social", {
      headers,
      cache: "no-store"
    });
    if (socialResponse.ok) {
      setSocialData((await socialResponse.json()) as SocialPayload);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    const response = await fetch(`/api/messages/${messageId}`, {
      method: "DELETE",
      headers
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not delete message.");
      playUiSound("error");
      return;
    }

    if (activeTextChannel) {
      void loadChannelMessages(activeTextChannel.id);
    }
    playUiSound("success");
  }

  async function handleCreateServer(name: string) {
    setCreateServerModalOpen(false);
    const headers = getAuthHeaders();

    if (!headers || !name.trim()) {
      return;
    }

    const response = await fetch("/api/servers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ name })
    });

    const payload = (await response.json().catch(() => null)) as
      | { serverId?: string; error?: string }
      | null;

    if (!response.ok || !payload?.serverId) {
      setError(payload?.error ?? "Could not create server.");
      playUiSound("error");
      return;
    }

    const bootstrapResponse = await fetch("/api/bootstrap", {
      headers,
      cache: "no-store"
    });

    if (bootstrapResponse.ok) {
      const nextData = (await bootstrapResponse.json()) as BootstrapPayload;
      setData(nextData);
      const nextServer = nextData.servers.find((server) => server.id === payload.serverId);

      if (nextServer) {
        setActiveServerId(nextServer.id);
        setActiveTextChannelId(getInitialTextChannel(nextServer).id);
        setActiveVoiceChannelId(
          nextServer.channels.find((channel) => channel.kind === "voice")?.id ?? ""
        );
      }
    }

    playUiSound("success");
  }

  async function handleJoinInvite(code: string) {
    setJoinInviteModalOpen(false);
    const headers = getAuthHeaders();

    if (!headers || !code.trim()) {
      return;
    }

    const response = await fetch(`/api/invites/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers
    });

    const payload = (await response.json().catch(() => null)) as
      | { serverId?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not join server.");
      playUiSound("error");
      return;
    }

    const bootstrapResponse = await fetch("/api/bootstrap", {
      headers,
      cache: "no-store"
    });

    if (bootstrapResponse.ok) {
      const nextData = (await bootstrapResponse.json()) as BootstrapPayload;
      setData(nextData);
      const nextServer = nextData.servers.find((server) => server.id === payload?.serverId);

      if (nextServer) {
        setActiveServerId(nextServer.id);
        setActiveTextChannelId(getInitialTextChannel(nextServer).id);
        setActiveVoiceChannelId(
          nextServer.channels.find((channel) => channel.kind === "voice")?.id ?? ""
        );
      }
    }

    playUiSound("success");
  }

  async function handleCreateInvite() {
    const headers = getAuthHeaders();

    if (!headers || !activeServer) {
      return;
    }

    const response = await fetch(`/api/servers/${activeServer.id}/invite`, {
      method: "POST",
      headers
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: string; error?: string }
      | null;

    if (!response.ok || !payload?.code) {
      setError(payload?.error ?? "Could not create invite.");
      playUiSound("error");
      return;
    }

    setActiveInviteCode(payload.code);
    playUiSound("success");
  }

  async function handleModerateMember(targetProfileId: string, action: "kick" | "ban") {
    const headers = getAuthHeaders();

    if (!headers || !activeServer) {
      return;
    }

    const response = await fetch(`/api/servers/${activeServer.id}/moderation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ targetProfileId, action })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not moderate member.");
      playUiSound("error");
      return;
    }

    playUiSound("success");
  }

  async function handleSaveProfile() {
    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify({
          name: profileName,
          handle: profileHandle,
          avatarUrl: profileAvatarUrl,
          bio: profileBio
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { profile?: AuthIdentity; error?: string }
        | null;

      if (!response.ok || !payload?.profile) {
        setAuthMessage(payload?.error ?? "Could not save profile.");
        playUiSound("error");
        return;
      }

      profileDraftDirtyRef.current = false;
      lastProfileSyncRef.current = profileSnapshotKey(payload.profile);
      setCurrentUser(payload.profile);
      setAuthMessage("Profile updated.");
      playUiSound("success");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleProfileNameChange(value: string) {
    profileDraftDirtyRef.current = true;
    setProfileName(value);
  }

  function handleProfileHandleChange(value: string) {
    profileDraftDirtyRef.current = true;
    setProfileHandle(value);
  }

  function handleProfileAvatarUrlChange(value: string) {
    profileDraftDirtyRef.current = true;
    setProfileAvatarUrl(value);
  }

  function handleProfileBioChange(value: string) {
    profileDraftDirtyRef.current = true;
    setProfileBio(value);
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
      playUiSound("error");
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

      playUiSound("success");
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
        playUiSound("error");
      }
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
    setActiveInviteCode(null);
    setAttachmentUrl("");
    setAttachmentOpen(false);
    setAuthMessage("Signed out.");
    playUiSound("leave");
  }

  

  if (!activeServer || !activeTextChannel) {
    return (
      <div className="space-y-4">
        <AuthPanel
          currentUser={currentUser}
          profileName={profileName}
          profileAvatarUrl={profileAvatarUrl}
          loading={authLoading}
          message={authMessage}
          onProfileNameChange={handleProfileNameChange}
          onProfileAvatarUrlChange={handleProfileAvatarUrlChange}
          onGoogleSignIn={handleGoogleSignIn}
          onSaveProfile={handleSaveProfile}
          onSignOut={handleSignOut}
        />
        {error ? (
          <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
            {error}
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-panel/90 px-6 py-8 shadow-panel">
          <button
            onClick={() => setCreateServerModalOpen(true)}
            className="rounded-2xl bg-ember px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white"
          >
            Create Server
          </button>
          <button
            onClick={() => setJoinInviteModalOpen(true)}
            className="rounded-2xl border border-white/10 bg-steel px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/80"
          >
            Join Invite
          </button>
          <span className="text-sm text-white/60">No servers are available for this account yet.</span>
        </div>
        <PromptModal
          open={createServerModalOpen}
          title="Create Server"
          description="Give your new server a name."
          placeholder="e.g. Night Squad"
          confirmLabel="Create"
          onConfirm={handleCreateServer}
          onCancel={() => setCreateServerModalOpen(false)}
        />
        <PromptModal
          open={joinInviteModalOpen}
          title="Join with Invite"
          description="Paste an invite code to join an existing server."
          placeholder="Invite code"
          confirmLabel="Join"
          onConfirm={handleJoinInvite}
          onCancel={() => setJoinInviteModalOpen(false)}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPanel
        currentUser={currentUser}
        profileName={profileName}
        profileAvatarUrl={profileAvatarUrl}
        loading={authLoading}
        message={authMessage}
        onProfileNameChange={handleProfileNameChange}
        onProfileAvatarUrlChange={handleProfileAvatarUrlChange}
        onGoogleSignIn={handleGoogleSignIn}
        onSaveProfile={handleSaveProfile}
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
        currentUser={currentUser}
        profileName={profileName}
        profileAvatarUrl={profileAvatarUrl}
        loading={authLoading}
        message={authMessage}
        onProfileNameChange={handleProfileNameChange}
        onProfileAvatarUrlChange={handleProfileAvatarUrlChange}
        onGoogleSignIn={handleGoogleSignIn}
        onSaveProfile={handleSaveProfile}
        onSignOut={handleSignOut}
      />

      <section className="grid gap-4 xl:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <ServerRail
          items={data.servers}
          activeId={activeServer.id}
          onSelect={handleServerSelect}
          onCreate={() => setCreateServerModalOpen(true)}
          onJoin={() => setJoinInviteModalOpen(true)}
          unreadCounts={unreadCounts}
        />
        <ChannelList
          server={activeServer}
          activeChannelId={activeTextChannel.id}
          activeVoiceChannelId={activeVoiceChannel?.id ?? ""}
          onlineMembers={onlineMembers}
          currentUserId={currentUser.id}
          inviteCode={activeInviteCode}
          canManageServer={activeServer.role === "owner"}
          unreadCounts={unreadCounts}
          onTextSelect={handleTextChannelSelect}
          onVoiceSelect={handleVoiceChannelSelect}
          onCreateInvite={handleCreateInvite}
          onModerateMember={handleModerateMember}
        />
        <ChatPanel
          channelName={viewMode === "dm" && activeThread ? activeThread.friendName : activeTextChannel.name}
          channelPrefix={viewMode === "dm" ? "@" : "#"}
          items={displayedMessages}
          composerValue={composerValue}
          attachmentUrl={attachmentUrl}
          attachmentOpen={attachmentOpen}
          pending={isPending || isSending}
          canSend={Boolean(currentUser)}
          typingMembers={activeTypingMembers}
          onComposerChange={handleComposerChange}
          onAttachmentChange={setAttachmentUrl}
          onToggleAttachment={() => setAttachmentOpen((current) => !current)}
          onSend={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
        />
        <VoicePanel
          roomName={activeVoiceChannel?.name ?? "No Room"}
          members={activeMembers}
          joined={joinedVoiceRoomId === activeVoiceChannel?.id}
          muted={isMuted}
          deafened={isDeafened}
          connecting={isVoiceConnecting}
          pushToTalk={isPushToTalk}
          transmitting={isPushToTalk && isPushToTalkActive && !isMuted}
          signalLevels={signalLevels}
          outputVolume={outputVolume}
          connectionStatus={voiceConnectionStatus}
          speakingUserIds={speakingUserIds}
          participants={activeMembers.length}
          pushToTalkKey={pushToTalkKey}
          onPushToTalkKeyChange={setPushToTalkKey}
          onToggleJoin={() => handleVoiceToggle(activeVoiceChannel?.id ?? null)}
          onToggleMute={() => setIsMuted(p => !p)}
          onToggleDeafen={() => setIsDeafened(p => !p)}
          onTogglePushToTalk={() => setIsPushToTalk(p => !p)}
          onOutputVolumeChange={setOutputVolume}
        />
      </section>

      <section>
        <div className="rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel">
          <SocialPanel
            friends={socialData.friends}
            incomingRequests={socialData.incomingRequests}
            outgoingRequests={socialData.outgoingRequests}
            directThreads={socialData.directThreads}
            friendEmail={friendEmail}
            activeThreadId={activeThreadId}
            onlineFriendIds={onlineFriendIds}
            unreadCounts={unreadCounts}
            onFriendEmailChange={setFriendEmail}
            onSendRequest={handleSendFriendRequest}
            onRespondRequest={handleRespondFriendRequest}
            onOpenThread={handleOpenThread}
          />
        </div>
      </section>
      <PromptModal
        open={createServerModalOpen}
        title="Create Server"
        description="Give your new server a name."
        placeholder="e.g. Night Squad"
        confirmLabel="Create"
        onConfirm={handleCreateServer}
        onCancel={() => setCreateServerModalOpen(false)}
      />
      <PromptModal
        open={joinInviteModalOpen}
        title="Join with Invite"
        description="Paste an invite code to join an existing server."
        placeholder="Invite code"
        confirmLabel="Join"
        onConfirm={handleJoinInvite}
        onCancel={() => setJoinInviteModalOpen(false)}
      />
    </div>
  );
}
