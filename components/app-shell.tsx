"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";

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

export function AppShell({ initialData }: { initialData: BootstrapPayload }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
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
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      setCurrentUser(mapUser(session?.user ?? null));
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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
  const activeMembers = activeVoiceChannel ? data.members[activeVoiceChannel.id] ?? [] : [];

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

    setComposerValue("");
    setError(null);

    const response = await fetch(`/api/channels/${activeTextChannel.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      setComposerValue(body);
      setError("Message failed to send.");
      return;
    }

    const payload = (await response.json()) as { message: Message };

    setData((current) => ({
      ...current,
      messages: {
        ...current.messages,
        [activeTextChannel.id]: [...(current.messages[activeTextChannel.id] ?? []), payload.message]
      }
    }));
  }

  async function handleVoiceToggle() {
    if (!activeVoiceChannel) {
      return;
    }

    if (joinedVoiceRoomId === activeVoiceChannel.id) {
      setJoinedVoiceRoomId(null);
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
  }

  async function handleAuthSubmit() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured for browser auth.");
      return;
    }

    const email = authEmail.trim();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthMessage("Email and password are required.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
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

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setAuthMessage("Signed out.");
  }

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.025] to-transparent shadow-panel">
        <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-ember/80">
              Web Voice Command Center
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
        currentUser={currentUser}
        loading={authLoading}
        message={authMessage}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
        onSignOut={handleSignOut}
      />

      <section className="grid gap-4 xl:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <ServerRail items={data.servers} activeId={activeServer.id} onSelect={handleServerSelect} />
        <ChannelList
          server={activeServer}
          activeChannelId={activeTextChannel.id}
          activeVoiceChannelId={activeVoiceChannel?.id ?? ""}
          onTextSelect={handleTextChannelSelect}
          onVoiceSelect={handleVoiceChannelSelect}
        />
        <ChatPanel
          channelName={activeTextChannel.name}
          items={activeMessages}
          composerValue={composerValue}
          pending={isPending}
          canSend={Boolean(currentUser)}
          onComposerChange={setComposerValue}
          onSend={handleSendMessage}
        />
        <VoicePanel
          roomName={activeVoiceChannel?.name ?? "No Room"}
          members={activeMembers}
          joined={joinedVoiceRoomId === activeVoiceChannel?.id}
          participants={voiceParticipants ?? activeMembers.length}
          onToggleJoin={handleVoiceToggle}
        />
      </section>

      <RoadmapCard />
    </div>
  );
}
