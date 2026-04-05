import {
  addMessage as addMemoryMessage,
  getBootstrap as getMemoryBootstrap,
  getMessages as getMemoryMessages,
  getVoiceMembers as getMemoryVoiceMembers
} from "@/lib/store";
import type { BootstrapPayload, Member, Message, Server } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function normalizeServers(
  servers: Array<{
    id: string;
    name: string;
    initials: string;
    accent: string;
    channels: Array<{
      id: string;
      name: string;
      kind: "text" | "voice";
      unread: number | null;
      members: number | null;
    }>;
  }>
): Server[] {
  return servers.map((server) => ({
    id: server.id,
    name: server.name,
    initials: server.initials,
    accent: server.accent,
    channels: server.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      kind: channel.kind,
      unread: channel.unread ?? undefined,
      members: channel.members ?? undefined
    }))
  }));
}

export async function getBootstrap(): Promise<BootstrapPayload> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemoryBootstrap();
  }

  const [{ data: serverRows, error: serverError }, { data: channelRows, error: channelError }] =
    await Promise.all([
      supabase
        .from("servers")
        .select("id,name,initials,accent,sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("channels")
        .select("id,server_id,name,kind,unread,members,sort_order")
        .order("sort_order", { ascending: true })
    ]);

  if (serverError || channelError || !serverRows || !channelRows) {
    return getMemoryBootstrap();
  }

  const servers = normalizeServers(
    serverRows.map((server) => ({
      id: server.id,
      name: server.name,
      initials: server.initials,
      accent: server.accent,
      channels: channelRows
        .filter((channel) => channel.server_id === server.id)
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          kind: channel.kind,
          unread: channel.unread,
          members: channel.members
        }))
    }))
  );

  const channelIds = servers.flatMap((server) => server.channels.map((channel) => channel.id));

  const { data: messageRows } = await supabase
    .from("messages")
    .select("id,channel_id,author,handle,body,timestamp")
    .in("channel_id", channelIds)
    .order("created_at", { ascending: true });

  const { data: memberRows } = await supabase
    .from("voice_room_members")
    .select("id,room_id,name,role,status")
    .in(
      "room_id",
      servers.flatMap((server) =>
        server.channels.filter((channel) => channel.kind === "voice").map((channel) => channel.id)
      )
    );

  const messages: Record<string, Message[]> = {};
  const members: Record<string, Member[]> = {};

  for (const channelId of channelIds) {
    messages[channelId] = [];
  }

  for (const row of messageRows ?? []) {
    const message: Message = {
      id: row.id,
      channelId: row.channel_id,
      author: row.author,
      handle: row.handle,
      body: row.body,
      timestamp: row.timestamp
    };

    if (!messages[row.channel_id]) {
      messages[row.channel_id] = [];
    }

    messages[row.channel_id].push(message);
  }

  for (const row of memberRows ?? []) {
    const member: Member = {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status
    };

    if (!members[row.room_id]) {
      members[row.room_id] = [];
    }

    members[row.room_id].push(member);
  }

  return {
    servers,
    messages,
    members
  };
}

export async function getMessages(channelId: string): Promise<Message[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemoryMessages(channelId);
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,channel_id,author,handle,body,timestamp")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return getMemoryMessages(channelId);
  }

  return data.map((row) => ({
    id: row.id,
    channelId: row.channel_id,
    author: row.author,
    handle: row.handle,
    body: row.body,
    timestamp: row.timestamp
  }));
}

export async function addMessage(channelId: string, body: string): Promise<Message> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return addMemoryMessage(channelId, body);
  }

  const trimmed = body.trim();

  if (!trimmed) {
    throw new Error("Message body is required.");
  }

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author: "You",
      handle: "@you",
      body: trimmed,
      timestamp
    })
    .select("id,channel_id,author,handle,body,timestamp")
    .single();

  if (error || !data) {
    return addMemoryMessage(channelId, body);
  }

  return {
    id: data.id,
    channelId: data.channel_id,
    author: data.author,
    handle: data.handle,
    body: data.body,
    timestamp: data.timestamp
  };
}

export async function getVoiceMembers(roomId: string): Promise<Member[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemoryVoiceMembers(roomId);
  }

  const { data, error } = await supabase
    .from("voice_room_members")
    .select("id,name,role,status")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return getMemoryVoiceMembers(roomId);
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status
  }));
}
