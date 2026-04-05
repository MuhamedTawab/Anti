"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";

import { ChannelList } from "@/components/channel-list";
import { ChatPanel } from "@/components/chat-panel";
import { RoadmapCard } from "@/components/roadmap-card";
import { ServerRail } from "@/components/server-rail";
import { VoicePanel } from "@/components/voice-panel";
import { AuthPanel } from "@/components/auth-panel";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AuthIdentity, BootstrapPayload, Channel, Message, Server } from "@/lib/types";

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
  const [presenceMembers, setPresenceMembers] = useState<Record<string, AuthIdentity & { roomId: string | null; serverId: string }>>({});
  const [isPending, startTransition] = useTransition();

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
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase
      .channel(`nightlink-room:${activeTextChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeTextChannelId}`
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
              [activeTextChannelId]: mergeMessage(current.messages[activeTextChannelId] ?? [], nextMessage)
            }
          }));
        }
      )
      .on("broadcast", { event: "message" }, (payload) => {
        const nextMessage = (payload.payload as { message?: Message }).message;

        if (!nextMessage) {
          return;
        }

        setData((current) => ({
          ...current,
          messages: {
            ...current.messages,
            [activeTextChannelId]: mergeMessage(current.messages[activeTextChannelId] ?? [], nextMessage)
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
  }, [activeTextChannelId, currentUser, supabase]);

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
    if (!currentUser) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadChannelMessages(activeTextChannelId);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeTextChannelId, currentUser]);

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
      role: member.roomId ? `In ${member.roomId}` : "Online",
      status: "online" as const
    }));

  function handleServerSelect(serverId: string) {
    const nextServer =
      data.servers.find((server) => server.id === serverId) ?? getInitialServer(data);
    const nextTextChannel = getInitialTextChannel(nextServer);
    const nextVoiceChannel =
      nextServer.channels.find((channel) => channel.kind === "voice")?.id ?? "";

    setActiveServerId(nextServer.id);
    setActiveTextChannelId(nextTextChannel.id);
    setActiveVoiceChannelId(nextVoiceChannel);
    setJoinedVoiceRoomId(null);
    setVoiceParticipants(null);
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

  function handleTextChannelSelect(channelId: string) {
    setActiveTextChannelId(channelId);
    setError(null);

    startTransition(() => {
      loadChannelMessages(channelId).catch(() => {
        setError("Could not load channel messages.");
      });
    });
  }

  function handleVoiceChannelSelect(channelId: string) {
    setActiveVoiceChannelId(channelId);
    setJoinedVoiceRoomId(null);
    setVoiceParticipants(null);
    setError(null);
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

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      channelId: activeTextChannel.id,
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
        [activeTextChannel.id]: mergeMessage(current.messages[activeTextChannel.id] ?? [], optimisticMessage)
      }
    }));

    try {
    const response = await fetch(`/api/channels/${activeTextChannel.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-nightlink-user-id": currentUser.id,
        "x-nightlink-user-email": currentUser.email,
        "x-nightlink-user-name": currentUser.name,
        "x-nightlink-user-handle": currentUser.handle
      },
      body: JSON.stringify({ body })
    });

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
            [activeTextChannel.id]: (current.messages[activeTextChannel.id] ?? []).filter(
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
          [activeTextChannel.id]: replaceMessage(
            current.messages[activeTextChannel.id] ?? [],
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

      void loadChannelMessages(activeTextChannel.id);
    } finally {
      setIsSending(false);
    }
  }

  async function handleVoiceToggle() {
    if (!activeVoiceChannel) {
      return;
    }

    if (joinedVoiceRoomId === activeVoiceChannel.id) {
      setJoinedVoiceRoomId(null);
      if (presenceChannelRef.current && currentUser) {
        await presenceChannelRef.current.track({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          handle: currentUser.handle,
          roomId: null,
          serverId: activeServerId
        });
      }
      setVoiceParticipants(null);
      return;
    }

    setError(null);

    const response = await fetch("/api/voice/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ roomId: activeVoiceChannel.id })
    });

    if (!response.ok) {
      setError("Voice room could not connect.");
      return;
    }

    const payload = (await response.json()) as { roomId: string; participants: number };
    setJoinedVoiceRoomId(payload.roomId);
    setVoiceParticipants(payload.participants);
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

    await supabase.auth.signOut();
    setPresenceMembers({});
    setAuthMode("signin");
    setAuthMessage("Signed out.");
  }

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
          channelName={activeTextChannel.name}
          items={activeMessages}
          composerValue={composerValue}
          pending={isPending || isSending}
          canSend={Boolean(currentUser)}
          onComposerChange={setComposerValue}
          onSend={handleSendMessage}
        />
        <VoicePanel
          roomName={activeVoiceChannel?.name ?? "No Room"}
          members={activeMembers}
          joined={joinedVoiceRoomId === activeVoiceChannel?.id}
          participants={activeMembers.length}
          onToggleJoin={handleVoiceToggle}
        />
      </section>

      <RoadmapCard />
    </div>
  );
}
