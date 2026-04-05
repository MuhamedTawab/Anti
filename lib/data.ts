import {
  addMessage as addMemoryMessage,
  addDirectMessage as addMemoryDirectMessage,
  ensureProfile as ensureMemoryProfile,
  getBootstrap as getMemoryBootstrap,
  getDirectMessages as getMemoryDirectMessages,
  getMessages as getMemoryMessages,
  getSocialData as getMemorySocialData,
  getVoiceMembers as getMemoryVoiceMembers
  ,
  respondToFriendRequest as respondToMemoryFriendRequest,
  sendFriendRequest as sendMemoryFriendRequest
} from "@/lib/store";
import type {
  AuthIdentity,
  BootstrapPayload,
  DirectThread,
  Friend,
  FriendRequest,
  Member,
  Message,
  Server,
  SocialPayload
} from "@/lib/types";
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

  for (const server of servers) {
    for (const channel of server.channels.filter((item) => item.kind === "voice")) {
      members[channel.id] = [];
    }
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

export async function addMessage(
  channelId: string,
  body: string,
  identity?: AuthIdentity
): Promise<Message> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return addMemoryMessage(channelId, body, identity);
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
      author: identity?.name ?? "You",
      handle: identity?.handle ?? "@you",
      body: trimmed,
      timestamp
    })
    .select("id,channel_id,author,handle,body,timestamp")
    .single();

  if (error || !data) {
    return addMemoryMessage(channelId, body, identity);
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
  return getMemoryVoiceMembers(roomId);
}

export async function ensureProfile(identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return ensureMemoryProfile(identity);
  }

  await supabase.from("profiles").upsert({
    id: identity.id,
    email: identity.email,
    name: identity.name,
    handle: identity.handle
  });

  return identity;
}

export async function getSocialData(identity: AuthIdentity): Promise<SocialPayload> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemorySocialData();
  }

  const { data: friendshipRows } = await supabase
    .from("friendships")
    .select("id,user_a,user_b")
    .or(`user_a.eq.${identity.id},user_b.eq.${identity.id}`);

  const friendIds = (friendshipRows ?? []).map((row) =>
    row.user_a === identity.id ? row.user_b : row.user_a
  );

  const [{ data: profileRows }, { data: incomingRows }, { data: outgoingRows }, { data: threadMembersRows }, { data: directMessageRows }] =
    await Promise.all([
      friendIds.length
        ? supabase.from("profiles").select("id,email,name,handle").in("id", friendIds)
        : Promise.resolve({ data: [] as Array<{ id: string; email: string; name: string; handle: string }> }),
      supabase
        .from("friend_requests")
        .select("id,sender_id,profiles!friend_requests_sender_id_fkey(id,email,name,handle)")
        .eq("receiver_id", identity.id)
        .eq("status", "pending"),
      supabase
        .from("friend_requests")
        .select("id,receiver_id,profiles!friend_requests_receiver_id_fkey(id,email,name,handle)")
        .eq("sender_id", identity.id)
        .eq("status", "pending"),
      supabase
        .from("direct_thread_members")
        .select("thread_id,profile_id")
        .or(`profile_id.eq.${identity.id},profile_id.in.(${friendIds.join(",") || "00000000-0000-0000-0000-000000000000"})`),
      supabase
        .from("direct_messages")
        .select("thread_id,body,created_at")
        .order("created_at", { ascending: false })
    ]);

  const friends: Friend[] = (profileRows ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    email: profile.email,
    online: false
  }));

  const incomingRequests: FriendRequest[] = (incomingRows ?? []).map((row) => {
    const sender = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      senderId: sender.id,
      senderName: sender.name,
      senderHandle: sender.handle,
      senderEmail: sender.email
    };
  });

  const outgoingRequests: FriendRequest[] = (outgoingRows ?? []).map((row) => {
    const receiver = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      senderId: receiver.id,
      senderName: receiver.name,
      senderHandle: receiver.handle,
      senderEmail: receiver.email
    };
  });

  const selfThreadIds = new Set(
    (threadMembersRows ?? []).filter((row) => row.profile_id === identity.id).map((row) => row.thread_id)
  );

  const directThreads: DirectThread[] = friends
    .map((friend) => {
      const threadId = (threadMembersRows ?? []).find(
        (row) => row.profile_id === friend.id && selfThreadIds.has(row.thread_id)
      )?.thread_id;

      if (!threadId) {
        return null;
      }

      return {
        id: threadId,
        friendId: friend.id,
        friendName: friend.name,
        friendHandle: friend.handle,
        lastMessage:
          directMessageRows?.find((message) => message.thread_id === threadId)?.body ?? null
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftMessage = directMessageRows?.find((message) => message.thread_id === left?.id);
      const rightMessage = directMessageRows?.find((message) => message.thread_id === right?.id);

      return (
        new Date(rightMessage?.created_at ?? 0).getTime() -
        new Date(leftMessage?.created_at ?? 0).getTime()
      );
    }) as DirectThread[];

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    directThreads
  };
}

export async function sendFriendRequest(identity: AuthIdentity, email: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return sendMemoryFriendRequest(identity, email);
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Friend email is required.");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", trimmed)
    .single();

  if (!target) {
    throw new Error("No Nightlink user found with that email.");
  }

  if (target.id === identity.id) {
    throw new Error("You cannot add yourself.");
  }

  const [a, b] = [identity.id, target.id].sort();
  const { data: existingFriendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();

  if (existingFriendship) {
    throw new Error("You are already friends.");
  }

  const { error } = await supabase.from("friend_requests").upsert({
    sender_id: identity.id,
    receiver_id: target.id,
    status: "pending"
  });

  if (error) {
    throw error;
  }
}

export async function respondToFriendRequest(
  identity: AuthIdentity,
  requestId: string,
  action: "accept" | "decline"
) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return respondToMemoryFriendRequest(identity, requestId, action);
  }

  const { data: request } = await supabase
    .from("friend_requests")
    .select("id,sender_id,receiver_id")
    .eq("id", requestId)
    .eq("receiver_id", identity.id)
    .single();

  if (!request) {
    throw new Error("Friend request not found.");
  }

  if (action === "decline") {
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    return null;
  }

  const [userA, userB] = [request.sender_id, request.receiver_id].sort();
  await supabase.from("friendships").upsert({
    user_a: userA,
    user_b: userB
  });

  await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);

  const { data: existingThreads } = await supabase
    .from("direct_thread_members")
    .select("thread_id,profile_id")
    .in("profile_id", [request.sender_id, request.receiver_id]);

  const candidate = (existingThreads ?? []).find((row) => {
    const members = (existingThreads ?? []).filter((entry) => entry.thread_id === row.thread_id);
    const ids = members.map((entry) => entry.profile_id).sort();
    return ids.length === 2 && ids[0] === userA && ids[1] === userB;
  });

  if (candidate) {
    return candidate.thread_id;
  }

  if (!candidate) {
    const { data: thread } = await supabase.from("direct_threads").insert({}).select("id").single();

    if (thread) {
      await supabase.from("direct_thread_members").insert([
        { thread_id: thread.id, profile_id: request.sender_id },
        { thread_id: thread.id, profile_id: request.receiver_id }
      ]);

      return thread.id;
    }
  }

  return null;
}

async function assertDirectThreadAccess(threadId: string, identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: membership } = await supabase
    .from("direct_thread_members")
    .select("id")
    .eq("thread_id", threadId)
    .eq("profile_id", identity.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("You do not have access to this private chat.");
  }

  return supabase;
}

export async function getDirectMessages(threadId: string, identity: AuthIdentity): Promise<Message[]> {
  const supabase = await assertDirectThreadAccess(threadId, identity);

  if (!supabase) {
    return getMemoryDirectMessages(threadId);
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .select("id,thread_id,author,handle,body,timestamp")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return getMemoryDirectMessages(threadId);
  }

  return data.map((row) => ({
    id: row.id,
    channelId: row.thread_id,
    author: row.author,
    handle: row.handle,
    body: row.body,
    timestamp: row.timestamp
  }));
}

export async function addDirectMessage(threadId: string, body: string, identity: AuthIdentity): Promise<Message> {
  const supabase = await assertDirectThreadAccess(threadId, identity);

  if (!supabase) {
    return addMemoryDirectMessage(threadId, body, identity);
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
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      author_id: identity.id,
      author: identity.name,
      handle: identity.handle,
      body: trimmed,
      timestamp
    })
    .select("id,thread_id,author,handle,body,timestamp")
    .single();

  if (error || !data) {
    return addMemoryDirectMessage(threadId, body, identity);
  }

  return {
    id: data.id,
    channelId: data.thread_id,
    author: data.author,
    handle: data.handle,
    body: data.body,
    timestamp: data.timestamp
  };
}
