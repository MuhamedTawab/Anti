"use client";

import { 
  createContext, 
  useContext, 
  useState, 
  useMemo, 
  useCallback, 
  useEffect, 
  useRef, 
  useTransition,
  startTransition,
  ReactNode
} from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuthSync } from "@/lib/hooks/use-auth-sync";
import { useWorkspaceData } from "@/lib/hooks/use-workspace-data";
import { useRealtimeChat } from "@/lib/hooks/use-realtime-chat";
import { usePresence } from "@/lib/hooks/use-presence";
import { useVoiceRoom } from "@/lib/hooks/use-voice-room";
import { useUiSounds } from "@/lib/hooks/use-ui-sounds";
import { NightlinkContext } from "@/lib/context";
import type { 
  BootstrapPayload, 
  Message, 
  SocialPayload, 
  AuthIdentity, 
  Channel, 
  Server, 
  Member 
} from "@/lib/types";

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

function mergeMessage(messages: Message[], nextMessage: Message) {
  const existingIndex = messages.findIndex((m) => m.id === nextMessage.id);
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
  const filtered = messages.filter((m) => m.id !== previousId);
  return mergeMessage(filtered, nextMessage);
}

function profileSnapshotKey(profile: AuthIdentity | null) {
  if (!profile) return null;
  return JSON.stringify({
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl ?? "",
    bio: profile.bio ?? ""
  });
}

export function NightlinkProvider({ 
  initialData, 
  children 
}: { 
  initialData: BootstrapPayload, 
  children: ReactNode 
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [composerValue, setComposerValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"channel" | "dm" | "profile">("channel");
  const [activeSocialTab, setActiveSocialTab] = useState<"friends" | "pending" | "blocked" | "profile">("friends");
  const [isSending, setIsSending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false);
  const [joinInviteModalOpen, setJoinInviteModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    (viewMode === "profile" ? "dm" : viewMode) as "channel" | "dm",
    setData as any,
    playUiSound
  );
  // V14 Global State
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const globalChannelRef = useRef<RealtimeChannel | null>(null);

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
    setPushToTalkKey,
    isRecordingPTT,
    setIsRecordingPTT,
    isScreenSharing,
    handleScreenShareToggle,
    remoteVideoStreams
  } = useVoiceRoom(supabase, currentUser, activeServerId || "", playUiSound, getAudioContext, setError, async (payload, channel) => {
    await channel?.send({ type: "broadcast", event: "signal", payload });
  });

  const { presenceMembers, setPresenceMembers } = usePresence(supabase, currentUser, activeServerId || "", joinedVoiceRoomId);

  const activeServer = useMemo(() => {
    if (!activeServerId) return null;
    return data.servers.find((s) => s.id === activeServerId) ?? null;
  }, [activeServerId, data.servers]);
  const activeTextChannel = useMemo(() => activeServer?.channels.find((c) => c.id === activeTextChannelId) ?? activeServer?.channels.find((c) => c.kind === "text") ?? activeServer?.channels[0] ?? null, [activeServer, activeTextChannelId]);
  const activeVoiceChannel = useMemo(() => activeServer?.channels.find((c) => c.id === activeVoiceChannelId) ?? activeServer?.channels.find((c) => c.kind === "voice") ?? null, [activeServer, activeVoiceChannelId]);

  const activeMessages = activeTextChannel ? data.messages[activeTextChannel.id] ?? [] : [];
  const displayedMessages = viewMode === "dm" && activeThread ? data.messages[activeThread.id] ?? [] : activeMessages;
  const speakingUserIds = Object.entries(participantLevels).filter(([, lvl]) => lvl > 0.06).map(([userId]) => userId);

  const activeMembers = activeVoiceChannel ? Object.values(presenceMembers).filter((m) => m.serverId === activeServer?.id && m.roomId === activeVoiceChannel.id).map((m) => ({ id: m.id, name: m.name, role: speakingUserIds.includes(m.id) ? "Speaking now" : "Live member", status: "online" as const, avatarUrl: m.avatarUrl ?? null })) : [];
  const onlineMembers = Object.values(presenceMembers).filter((m) => m.serverId === activeServer?.id).map((m) => ({ id: m.id, name: m.name, role: m.roomId ? activeServer?.channels.find((c) => c.id === m.roomId)?.name ?? "In voice" : "Online", status: "online" as const, avatarUrl: m.avatarUrl ?? null }));
  const onlineFriendIds = Object.keys(presenceMembers);
  const activeTypingMembers = Object.values(typingMembers).filter((m) => m.channelId === activeChatKey && m.expiresAt > Date.now()).map((m) => m.name);

  // V14: Global Pulse Listener
  useEffect(() => {
    if (!supabase || !currentUser) return;

    const channel = supabase.channel('nightlink-global');
    
    channel.on('broadcast', { event: 'new-message' }, (payload) => {
      const { channelId, authorId } = payload.payload as { channelId: string; authorId: string };
      if (authorId === currentUser.id) return;

      const isWindowHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const isNotActiveChannel = channelId !== activeChatKey;
      
      if (isWindowHidden || isNotActiveChannel) {
        playUiSound("receive");
      }

      if (isNotActiveChannel) {
        setUnreadCounts(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || 0) + 1
        }));
      }
    }).subscribe();

    globalChannelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, currentUser, activeChatKey, playUiSound]);

  async function handleServerSelect(serverId: string) {
    const nextServer = data.servers.find((s) => s.id === serverId) ?? (data.servers[0] ?? null);
    if (!nextServer) return;
    const nextTextChannel = getInitialTextChannel(nextServer);
    const nextVoiceChannel = nextServer.channels.find((c) => c.kind === "voice")?.id ?? "";
    if (joinedVoiceRoomId) await leaveVoiceRoom(nextServer.id);
    setActiveServerId(nextServer.id);
    setActiveTextChannelId(nextTextChannel.id);
    setActiveVoiceChannelId(nextVoiceChannel);
    setActiveInviteCode(null);
    setViewMode("channel");
    setError(null);
  }

  const loadDirectMessages = useCallback(async (threadId: string) => {
    // V14: Cache-first for DMs
    const hasCache = (data.messages[threadId] ?? []).length > 0;
    if (!hasCache) setIsLoadingMore(true);

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/dm/${threadId}/messages`, { cache: "no-store", headers: authHeaders ?? {} });
      if (response.ok) {
        const payload = (await response.json()) as { messages: Message[] };
        setData((current) => ({
          ...current,
          messages: { ...current.messages, [threadId]: payload.messages }
        }));
        setHasMore(payload.messages.length >= 50);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [data.messages, getAuthHeaders, setData]);

  // V14: Global Message Pulse Listener
  useEffect(() => {
    if (!supabase || !currentUser) return;

    const channel = supabase.channel('nightlink-global');
    
    channel.on('broadcast', { event: 'new-message' }, (payload) => {
      const { channelId, authorId, message } = payload.payload as { channelId: string; authorId: string; message: Message };
      if (authorId === currentUser.id) return;

      const isWindowHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const isNotActiveChat = channelId !== activeChatKey;
      
      if (isWindowHidden || isNotActiveChat) {
        playUiSound("receive");
      }

      // V15: Instant Hydration - Append message even if not active
      if (message) {
        setData(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [channelId]: mergeMessage(prev.messages[channelId] || [], message)
          }
        }));
      }

      if (isNotActiveChat) {
        setUnreadCounts(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || 0) + 1
        }));
      }
    }).subscribe();

    globalChannelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, currentUser, activeChatKey, playUiSound]);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    // V14: Only set loading visual if we don't have these messages cached already
    const hasCache = (data.messages[channelId] ?? []).length > 0;
    
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        cache: "no-store",
        headers: { ...(authHeaders ?? {}) }
      });
      
      if (response.ok) {
        const payload = await response.json() as { messages: Message[] };
        setData((current) => ({
          ...current,
          messages: {
            ...current.messages,
            [channelId]: payload.messages
          }
        }));
      }
    } catch(e) {
      console.error("Pulse: History sync failed", e);
    }
  }, [data.messages, setData, getAuthHeaders]);

  const handleTextChannelSelect = useCallback((id: string) => {
    setActiveTextChannelId(id);
    setActiveThreadId(null);
    setViewMode("channel");
    setError(null);
    
    // Clear unreads
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // Load messages with background cache awareness
    loadChannelMessages(id).catch(() => setError("Could not sync message history."));
  }, [setActiveTextChannelId, setActiveThreadId, setViewMode, loadChannelMessages]);

  async function handleVoiceChannelSelect(channelId: string) {
    if (joinedVoiceRoomId) await leaveVoiceRoom();
    setActiveVoiceChannelId(channelId);
    setError(null);
  }

  function handleHomeSelect() {
    setActiveServerId(null);
    setViewMode("dm");
    setActiveThreadId(null);
  }

  const handleOpenThread = useCallback(async (id: string) => {
    // Try to find if 'id' is a thread.id or a friendId
    const thread = socialData.directThreads.find((t) => t.id === id || t.friendId === id);
    const resolvedThreadId = thread ? thread.id : id;

    setActiveThreadId(resolvedThreadId);
    setViewMode("dm");
    
    // Clear unread for this DM thread
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[resolvedThreadId];
      return next;
    });

    setError(null);
    loadDirectMessages(resolvedThreadId).catch(() => setError("Could not sync message history."));
  }, [socialData.directThreads, setActiveThreadId, setViewMode, loadDirectMessages]);

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    const oldest = displayedMessages[0];
    const before = oldest?.createdAt;
    if (!before) return;
    const authHeaders = getAuthHeaders();
    setIsLoadingMore(true);
    try {
      const url = viewMode === "dm" && activeThread
        ? `/api/dm/${activeThread.id}/messages?before=${encodeURIComponent(before)}`
        : `/api/channels/${activeChatKey}/messages?before=${encodeURIComponent(before)}`;
      const resp = await fetch(url, { headers: { "Content-Type": "application/json", ...(authHeaders ?? {}) } });
      if (!resp.ok) return;
      const payload = await resp.json() as { messages?: Message[] };
      const older = payload.messages ?? [];
      if (older.length < 50) setHasMore(false);
      if (older.length === 0) return;
      setData((current) => ({
        ...current,
        messages: { ...current.messages, [activeChatKey]: [...older, ...(current.messages[activeChatKey] ?? [])] }
      }));
    } catch {
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSendMessage() {
    const body = composerValue.trim();
    const nextAttachmentUrl = attachmentUrl.trim();
    if ((!body && !nextAttachmentUrl) || !currentUser || !accessToken) return;
    const activeTargetId = activeChatKey;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      channelId: activeTargetId,
      author: currentUser.name,
      handle: currentUser.handle,
      body,
      attachments: nextAttachmentUrl ? [{ id: `${optimisticId}-attachment`, kind: /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(nextAttachmentUrl) ? "image" : "link", url: nextAttachmentUrl, name: decodeURIComponent((nextAttachmentUrl.split("?")[0] ?? nextAttachmentUrl).split("/").pop() || "attachment") }] : [],
      timestamp: "sending...",
      optimistic: true,
      authorAvatarUrl: currentUser.avatarUrl ?? null,
      canModerate: true
    };
    // V15: Zero-Latency Logic - Broadcast full payload globally for instant hydration
    if (globalChannelRef.current) {
      void globalChannelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: { channelId: activeTargetId, authorId: currentUser.id, message: optimisticMessage }
      });
    }

    setComposerValue("");
    setAttachmentUrl("");
    setAttachmentOpen(false);
    setError(null);
    setIsSending(true);
    setData((cur) => ({ ...cur, messages: { ...cur.messages, [activeTargetId]: mergeMessage(cur.messages[activeTargetId] ?? [], optimisticMessage) } }));
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(viewMode === "dm" ? `/api/dm/${activeTargetId}/messages` : `/api/channels/${activeTargetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ body, attachmentUrl: nextAttachmentUrl || null })
      });
      const payload = await response.json().catch(() => null);
      const nextMessage = payload?.message;
      if (!response.ok || !nextMessage) throw new Error(payload?.error ?? "Failed to send.");
      setData((cur) => ({ ...cur, messages: { ...cur.messages, [activeTargetId]: replaceMessage(cur.messages[activeTargetId] ?? [], optimisticId, nextMessage) } }));
      await realtimeChannelRef.current?.send({ type: "broadcast", event: "message", payload: { message: nextMessage } });
      playUiSound("send");
    } catch (e: any) {
      setComposerValue(body);
      setError(e.message);
      playUiSound("error");
      setData((cur) => ({ ...cur, messages: { ...cur.messages, [activeTargetId]: (cur.messages[activeTargetId] ?? []).filter(m => m.id !== optimisticId) } }));
    } finally {
      setIsSending(false);
    }
  }

  const typingDebounceRef = useRef<any>(null);
  function handleComposerChange(value: string) {
    setComposerValue(value);
    if (!value.trim() || !currentUser || !realtimeChannelRef.current) return;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      void realtimeChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUser.id, name: currentUser.name, channelId: activeChatKey } });
    }, 300);
  }

  async function handleSendFriendRequest() {
    const headers = getAuthHeaders();
    if (!headers) return;
    setError(null);
    const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ email: friendEmail }) });
    if (!response.ok) { playUiSound("error"); setError("Could not send request."); return; }
    setFriendEmail(""); playUiSound("success");
    const soc = await fetch("/api/social", { headers, cache: "no-store" });
    if (soc.ok) setSocialData(await soc.json());
  }

  async function handleRespondFriendRequest(requestId: string, action: "accept" | "decline") {
    const headers = getAuthHeaders();
    if (!headers) return;
    const response = await fetch(`/api/friends/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ action }) });
    if (!response.ok) { playUiSound("error"); return; }
    playUiSound("success"); 
    const soc = await fetch("/api/social", { headers, cache: "no-store" });
    if (soc.ok) setSocialData(await soc.json());
  }

  async function handleDeleteMessage(messageId: string) {
    const headers = getAuthHeaders();
    if (!headers) return;
    const response = await fetch(`/api/messages/${messageId}`, { method: "DELETE", headers });
    if (!response.ok) { playUiSound("error"); return; }
    if (activeTextChannel) void loadChannelMessages(activeTextChannel.id);
    playUiSound("success");
  }

  async function handleCreateServer(name: string) {
    setCreateServerModalOpen(false);
    const headers = getAuthHeaders();
    if (!headers || !name.trim()) return;
    const response = await fetch("/api/servers", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ name }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.serverId) { playUiSound("error"); return; }
    const boot = await fetch("/api/bootstrap", { headers, cache: "no-store" });
    if (boot.ok) {
      const nextData = await boot.json();
      setData(nextData);
      const srv = nextData.servers.find((s: any) => s.id === payload.serverId);
      if (srv) { setActiveServerId(srv.id); setActiveTextChannelId(getInitialTextChannel(srv).id); setActiveVoiceChannelId(srv.channels.find((c: any) => c.kind === "voice")?.id ?? ""); }
    }
    playUiSound("success");
  }

  async function handleJoinInvite(code: string) {
    setJoinInviteModalOpen(false);
    const headers = getAuthHeaders();
    if (!headers || !code.trim()) return;
    const response = await fetch(`/api/invites/${encodeURIComponent(code)}/join`, { method: "POST", headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { playUiSound("error"); return; }
    const boot = await fetch("/api/bootstrap", { headers, cache: "no-store" });
    if (boot.ok) {
      const nextData = await boot.json();
      setData(nextData);
      const srv = nextData.servers.find((s: any) => s.id === payload?.serverId);
      if (srv) { setActiveServerId(srv.id); setActiveTextChannelId(getInitialTextChannel(srv).id); setActiveVoiceChannelId(srv.channels.find((c: any) => c.kind === "voice")?.id ?? ""); }
    }
    playUiSound("success");
  }

  async function handleCreateInvite() {
    const headers = getAuthHeaders();
    if (!headers || !activeServer) return;
    const response = await fetch(`/api/servers/${activeServer.id}/invite`, { method: "POST", headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.code) { playUiSound("error"); return; }
    setActiveInviteCode(payload.code);
    playUiSound("success");
  }

  async function handleModerateMember(targetProfileId: string, action: "kick" | "ban") {
    const headers = getAuthHeaders();
    if (!headers || !activeServer) return;
    const response = await fetch(`/api/servers/${activeServer.id}/moderation`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ targetProfileId, action }) });
    if (!response.ok) { playUiSound("error"); return; }
    playUiSound("success");
  }

  async function handleSaveProfile() {
    const headers = getAuthHeaders();
    if (!headers) return;
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ name: profileName, handle: profileHandle, avatarUrl: profileAvatarUrl, bio: profileBio }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.profile) { setAuthMessage(payload?.error ?? "Save failed."); playUiSound("error"); return; }
      profileDraftDirtyRef.current = false; lastProfileSyncRef.current = profileSnapshotKey(payload.profile);
      setCurrentUser(payload.profile); setAuthMessage("Profile updated."); playUiSound("success");
    } finally { setAuthLoading(false); }
  }

  const value = useMemo(() => ({
    currentUser, accessToken, authLoading, authMessage, setAuthMessage, getAuthHeaders,
    data, setData, socialData, setSocialData,
    activeServerId, setActiveServerId, activeTextChannelId, setActiveTextChannelId, activeVoiceChannelId, setActiveVoiceChannelId, activeThreadId, setActiveThreadId, viewMode, setViewMode,
    activeServer, activeTextChannel, activeVoiceChannel, activeThread, activeChatKey, displayedMessages, activeMembers, onlineMembers, onlineFriendIds, activeTypingMembers, unreadCounts,
    error, setError, composerValue, setComposerValue, attachmentUrl, setAttachmentUrl, attachmentOpen, setAttachmentOpen, isSending, isPending, hasMore, isLoadingMore,
    joinedVoiceRoomId, isVoiceConnecting, isMuted, setIsMuted, isDeafened, setIsDeafened, isPushToTalk, setIsPushToTalk, isPushToTalkActive, voiceConnectionStatus, outputVolume, setOutputVolume, signalLevels, participantLevels, isScreenSharing, remoteVideoStreams,
    pushToTalkKey, setPushToTalkKey, isRecordingPTT, setIsRecordingPTT,
    handleSendMessage, handleLoadMore, handleComposerChange, handleTextChannelSelect, handleVoiceChannelSelect, handleServerSelect, handleHomeSelect, handleOpenThread, handleVoiceToggle, handleScreenShareToggle, handleCreateServer, handleJoinInvite, handleCreateInvite, handleModerateMember, handleDeleteMessage, handleSendFriendRequest, handleRespondFriendRequest,
    profileName, profileHandle, profileAvatarUrl, profileBio, handleProfileNameChange: setProfileName, handleProfileHandleChange: setProfileHandle, handleProfileAvatarUrlChange: setProfileAvatarUrl, handleProfileBioChange: setProfileBio, handleSaveProfile,
    createServerModalOpen, setCreateServerModalOpen, joinInviteModalOpen, setJoinInviteModalOpen, activeInviteCode, setActiveInviteCode,
    friendEmail, setFriendEmail,
    activeSocialTab, setActiveSocialTab
  }), [
    currentUser, accessToken, authLoading, authMessage, data, socialData, activeServerId, activeTextChannelId, activeVoiceChannelId, activeThreadId, viewMode, activeServer, activeTextChannel, activeVoiceChannel, activeThread, activeChatKey, displayedMessages, activeMembers, onlineMembers, onlineFriendIds, activeTypingMembers, unreadCounts, error, composerValue, attachmentUrl, attachmentOpen, isSending, isPending, hasMore, isLoadingMore, joinedVoiceRoomId, isVoiceConnecting, isMuted, isDeafened, isPushToTalk, isPushToTalkActive, voiceConnectionStatus, outputVolume, signalLevels, participantLevels, isScreenSharing, remoteVideoStreams, pushToTalkKey, isRecordingPTT, handleSendMessage, handleLoadMore, handleComposerChange, handleTextChannelSelect, handleVoiceChannelSelect, handleServerSelect, handleHomeSelect, handleOpenThread, handleVoiceToggle, handleScreenShareToggle, handleCreateServer, handleJoinInvite, handleCreateInvite, handleModerateMember, handleDeleteMessage, handleSendFriendRequest, handleRespondFriendRequest, profileName, profileHandle, profileAvatarUrl, profileBio, handleSaveProfile, createServerModalOpen, joinInviteModalOpen, activeInviteCode, friendEmail, activeSocialTab
  ]);

  return (
    <NightlinkContext.Provider value={value}>
      {children}
    </NightlinkContext.Provider>
  );
}
