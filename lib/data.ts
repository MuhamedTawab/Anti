import {
  addDirectMessage as addMemoryDirectMessage,
  addMessage as addMemoryMessage,
  ensureProfile as ensureMemoryProfile,
  getBootstrap as getMemoryBootstrap,
  getDirectMessages as getMemoryDirectMessages,
  getMessages as getMemoryMessages,
  getSocialData as getMemorySocialData,
  getVoiceMembers as getMemoryVoiceMembers,
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
  MessageAttachment,
  Server,
  SocialPayload
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (parts.join("").slice(0, 2) || name.slice(0, 2) || "NL").toUpperCase();
}

function normalizeHandle(handle: string) {
  const trimmed = handle.trim().replace(/^@+/, "");
  return `@${trimmed.toLowerCase()}`;
}

function inferAttachmentKind(url: string): "image" | "link" {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url) ? "image" : "link";
}

function createAttachment(url: string): Omit<MessageAttachment, "id"> {
  const cleanedUrl = url.trim();
  const path = cleanedUrl.split("?")[0] ?? cleanedUrl;
  const name = decodeURIComponent(path.split("/").pop() || "attachment");

  return {
    kind: inferAttachmentKind(cleanedUrl),
    url: cleanedUrl,
    name
  };
}

function mapProfileRow(profile: {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatar_url?: string | null;
  bio?: string | null;
}): AuthIdentity {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatar_url ?? null,
    bio: profile.bio ?? ""
  };
}

async function getProfileRows(profileIds: string[]) {
  const supabase = getSupabaseServerClient();

  if (!supabase || !profileIds.length) {
    return new Map<
      string,
      { avatar_url: string | null; name: string; handle: string; email: string; bio: string }
    >();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,email,name,handle,avatar_url,bio")
    .in("id", profileIds);

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        email: row.email,
        name: row.name,
        handle: row.handle,
        avatar_url: row.avatar_url ?? null,
        bio: row.bio ?? ""
      }
    ])
  );
}

async function getAccessibleServers(identity?: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const [{ data: serverRows }, { data: channelRows }, membershipsResult, bansResult] =
    await Promise.all([
      supabase
        .from("servers")
        .select("id,name,initials,accent,owner_id,sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("channels")
        .select("id,server_id,name,kind,unread,members,sort_order")
        .order("sort_order", { ascending: true }),
      identity
        ? supabase.from("server_memberships").select("server_id,role").eq("profile_id", identity.id)
        : Promise.resolve({ data: [] as Array<{ server_id: string; role: "owner" | "member" }> }),
      identity
        ? supabase.from("server_bans").select("server_id").eq("profile_id", identity.id)
        : Promise.resolve({ data: [] as Array<{ server_id: string }> })
    ]);

  const memberships = new Map((membershipsResult.data ?? []).map((row) => [row.server_id, row.role]));
  const bannedServerIds = new Set((bansResult.data ?? []).map((row) => row.server_id));

  const servers: Server[] = (serverRows ?? [])
    .filter((server) => {
      if (bannedServerIds.has(server.id)) {
        return false;
      }

      if (!server.owner_id) {
        return true;
      }

      return Boolean(identity && (server.owner_id === identity.id || memberships.has(server.id)));
    })
    .map((server) => ({
      id: server.id,
      name: server.name,
      initials: server.initials,
      accent: server.accent,
      ownerId: server.owner_id,
      role:
        !server.owner_id
          ? "public"
          : server.owner_id === identity?.id
            ? "owner"
            : (memberships.get(server.id) ?? "member"),
      channels: (channelRows ?? [])
        .filter((channel) => channel.server_id === server.id)
        .map((channel) => ({
          id: channel.id,
          serverId: channel.server_id,
          name: channel.name,
          kind: channel.kind,
          unread: channel.unread ?? undefined,
          members: channel.members ?? undefined
        }))
    }));

  return servers;
}

async function getChannelServerMap(channelIds: string[]) {
  const supabase = getSupabaseServerClient();

  if (!supabase || !channelIds.length) {
    return new Map<string, string>();
  }

  const { data } = await supabase.from("channels").select("id,server_id").in("id", channelIds);
  return new Map((data ?? []).map((row) => [row.id, row.server_id]));
}

async function getMessageAttachmentsMap(
  messageIds: string[],
  table: "message_attachments" | "direct_message_attachments",
  foreignKey: "message_id" | "direct_message_id"
) {
  const supabase = getSupabaseServerClient();

  if (!supabase || !messageIds.length) {
    return new Map<string, MessageAttachment[]>();
  }

  const { data } = await supabase.from(table).select(`id,${foreignKey},kind,url,name`).in(foreignKey, messageIds);
  const attachments = new Map<string, MessageAttachment[]>();

  for (const row of data ?? []) {
    const key = (row as Record<string, string>)[foreignKey];
    const existing = attachments.get(key) ?? [];
    existing.push({
      id: row.id,
      kind: row.kind,
      url: row.url,
      name: row.name
    });
    attachments.set(key, existing);
  }

  return attachments;
}

async function canModerateServer(identity: AuthIdentity, serverId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const { data: server } = await supabase.from("servers").select("owner_id").eq("id", serverId).maybeSingle();
  return server?.owner_id === identity.id;
}

async function assertServerMembership(serverId: string, identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: server } = await supabase.from("servers").select("id,owner_id").eq("id", serverId).maybeSingle();

  if (!server) {
    throw new Error("Server not found.");
  }

  if (!server.owner_id || server.owner_id === identity.id) {
    return server;
  }

  const [{ data: membership }, { data: ban }] = await Promise.all([
    supabase
      .from("server_memberships")
      .select("id")
      .eq("server_id", serverId)
      .eq("profile_id", identity.id)
      .maybeSingle(),
    supabase.from("server_bans").select("id").eq("server_id", serverId).eq("profile_id", identity.id).maybeSingle()
  ]);

  if (ban) {
    throw new Error("You are banned from this server.");
  }

  if (!membership) {
    throw new Error("You do not have access to this server.");
  }

  return server;
}

async function assertChannelAccess(channelId: string, identity?: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: channel } = await supabase.from("channels").select("id,server_id").eq("id", channelId).maybeSingle();

  if (!channel) {
    throw new Error("Channel not found.");
  }

  if (identity) {
    await assertServerMembership(channel.server_id, identity);
  }

  return channel;
}

export async function getBootstrap(identity?: AuthIdentity): Promise<BootstrapPayload> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemoryBootstrap();
  }

  const servers = (await getAccessibleServers(identity)) ?? getMemoryBootstrap().servers;
  const normalizedServers = servers.length ? servers : getMemoryBootstrap().servers;
  const channelIds = normalizedServers.flatMap((server) => server.channels.map((channel) => channel.id));

  const { data: messageRows } = channelIds.length
    ? await supabase
        .from("messages")
        .select("id,channel_id,author_id,author,handle,body,timestamp")
        .in("channel_id", channelIds)
        .order("created_at", { ascending: true })
    : {
        data: [] as Array<{
          id: string;
          channel_id: string;
          author_id: string | null;
          author: string;
          handle: string;
          body: string;
          timestamp: string;
        }>
      };

  const profileMap = await getProfileRows(
    Array.from(new Set((messageRows ?? []).flatMap((row) => (row.author_id ? [row.author_id] : []))))
  );
  const attachmentMap = await getMessageAttachmentsMap(
    (messageRows ?? []).map((row) => row.id),
    "message_attachments",
    "message_id"
  );
  const channelServerMap = await getChannelServerMap(channelIds);
  const ownerServerIds = new Set(
    normalizedServers.filter((server) => server.role === "owner").map((server) => server.id)
  );

  const messages: Record<string, Message[]> = {};
  const members: Record<string, Member[]> = {};

  for (const channelId of channelIds) {
    messages[channelId] = [];
  }

  for (const row of messageRows ?? []) {
    const profile = row.author_id ? profileMap.get(row.author_id) : null;
    const serverId = channelServerMap.get(row.channel_id);

    messages[row.channel_id] ??= [];
    messages[row.channel_id].push({
      id: row.id,
      channelId: row.channel_id,
      authorId: row.author_id,
      author: row.author,
      handle: row.handle,
      body: row.body,
      timestamp: row.timestamp,
      attachments: attachmentMap.get(row.id) ?? [],
      authorAvatarUrl: profile?.avatar_url ?? null,
      canModerate: Boolean(
        identity && (row.author_id === identity.id || (serverId && ownerServerIds.has(serverId)))
      )
    });
  }

  for (const server of normalizedServers) {
    for (const channel of server.channels.filter((item) => item.kind === "voice")) {
      members[channel.id] = [];
    }
  }

  return {
    servers: normalizedServers,
    messages,
    members
  };
}

export async function getMessages(channelId: string, identity?: AuthIdentity): Promise<Message[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getMemoryMessages(channelId);
  }

  const channel = await assertChannelAccess(channelId, identity);
  const { data, error } = await supabase
    .from("messages")
    .select("id,channel_id,author_id,author,handle,body,timestamp")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return getMemoryMessages(channelId);
  }

  const attachmentMap = await getMessageAttachmentsMap(
    data.map((row) => row.id),
    "message_attachments",
    "message_id"
  );
  const profileMap = await getProfileRows(
    Array.from(new Set(data.flatMap((row) => (row.author_id ? [row.author_id] : []))))
  );
  const ownerAccess =
    identity && channel ? await canModerateServer(identity, channel.server_id) : false;

  return data.map((row) => ({
    id: row.id,
    channelId: row.channel_id,
    authorId: row.author_id,
    author: row.author,
    handle: row.handle,
    body: row.body,
    timestamp: row.timestamp,
    attachments: attachmentMap.get(row.id) ?? [],
    authorAvatarUrl: row.author_id ? profileMap.get(row.author_id)?.avatar_url ?? null : null,
    canModerate: Boolean(identity && (row.author_id === identity.id || ownerAccess))
  }));
}

export async function addMessage(
  channelId: string,
  body: string,
  identity?: AuthIdentity,
  attachmentUrl?: string | null
): Promise<Message> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return addMemoryMessage(channelId, body, identity);
  }

  const trimmed = body.trim();
  const trimmedAttachment = attachmentUrl?.trim() ?? "";

  if (!trimmed && !trimmedAttachment) {
    throw new Error("Message body or attachment is required.");
  }

  await assertChannelAccess(channelId, identity);

  const timestamp = formatTimestamp(new Date());

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: identity?.id ?? null,
      author: identity?.name ?? "You",
      handle: identity?.handle ?? "@you",
      body: trimmed || "Attachment",
      timestamp
    })
    .select("id,channel_id,author_id,author,handle,body,timestamp")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save message.");
  }

  const attachments = trimmedAttachment
    ? [{ id: `${data.id}-attachment`, ...createAttachment(trimmedAttachment) }]
    : [];

  if (attachments.length) {
    await supabase.from("message_attachments").insert(
      attachments.map((attachment) => ({
          message_id: data.id,
          kind: attachment.kind,
          url: attachment.url,
          name: attachment.name
      }))
    );
  }

  return {
    id: data.id,
    channelId: data.channel_id,
    authorId: data.author_id,
    author: data.author,
    handle: data.handle,
    body: data.body,
    timestamp: data.timestamp,
    attachments,
    authorAvatarUrl: identity?.avatarUrl ?? null,
    canModerate: true
  };
}

export async function deleteServerMessage(messageId: string, identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Message deletion requires Supabase.");
  }

  const { data: message } = await supabase
    .from("messages")
    .select("id,channel_id,author_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    throw new Error("Message not found.");
  }

  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", message.channel_id)
    .maybeSingle();

  if (!channel) {
    throw new Error("Channel not found.");
  }

  const ownerAccess = await canModerateServer(identity, channel.server_id);

  if (!ownerAccess && message.author_id !== identity.id) {
    throw new Error("You cannot delete this message.");
  }

  await supabase.from("message_attachments").delete().eq("message_id", messageId);
  await supabase.from("messages").delete().eq("id", messageId);

  await supabase.from("moderation_actions").insert({
    server_id: channel.server_id,
    actor_id: identity.id,
    message_id: messageId,
    action: "delete_message",
    reason: message.author_id === identity.id ? "self-delete" : "owner-delete"
  });
}

export async function getVoiceMembers(roomId: string): Promise<Member[]> {
  return getMemoryVoiceMembers(roomId);
}

export async function ensureProfile(identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return ensureMemoryProfile(identity);
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id,email,name,handle,avatar_url,bio")
    .eq("id", identity.id)
    .maybeSingle();

  const payload = {
    id: identity.id,
    email: identity.email.toLowerCase(),
    name: existing?.name ?? identity.name,
    handle: existing?.handle ?? normalizeHandle(identity.handle),
    avatar_url: existing?.avatar_url ?? identity.avatarUrl ?? null,
    bio: existing?.bio ?? identity.bio ?? ""
  };

  await supabase.from("profiles").upsert(payload);

  return mapProfileRow(payload);
}

export async function getProfile(identity: AuthIdentity) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return ensureMemoryProfile(identity);
  }

  await ensureProfile(identity);

  const { data } = await supabase
    .from("profiles")
    .select("id,email,name,handle,avatar_url,bio")
    .eq("id", identity.id)
    .single();

  if (!data) {
    throw new Error("Profile not found.");
  }

  return mapProfileRow(data);
}

export async function updateProfile(
  identity: AuthIdentity,
  updates: { name?: string; handle?: string; avatarUrl?: string | null; bio?: string }
) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return ensureMemoryProfile({
      ...identity,
      name: updates.name ?? identity.name,
      handle: updates.handle ?? identity.handle,
      avatarUrl: updates.avatarUrl ?? identity.avatarUrl,
      bio: updates.bio ?? identity.bio
    });
  }

  const nextName = updates.name?.trim() || identity.name;
  const nextHandle = updates.handle?.trim() ? normalizeHandle(updates.handle) : identity.handle;
  const nextBio = updates.bio?.trim() ?? identity.bio ?? "";
  const nextAvatarUrl = updates.avatarUrl?.trim() || null;

  const { data: conflicting } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", nextHandle)
    .neq("id", identity.id)
    .maybeSingle();

  if (conflicting) {
    throw new Error("That handle is already taken.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: nextName,
      handle: nextHandle,
      avatar_url: nextAvatarUrl,
      bio: nextBio
    })
    .eq("id", identity.id)
    .select("id,email,name,handle,avatar_url,bio")
    .single();

  if (error || !data) {
    throw new Error("Could not update profile.");
  }

  return mapProfileRow(data);
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

  const [
    { data: profileRows },
    { data: incomingRows },
    { data: outgoingRows },
    { data: threadMembersRows },
    { data: directMessageRows }
  ] = await Promise.all([
    friendIds.length
      ? supabase.from("profiles").select("id,email,name,handle,avatar_url").in("id", friendIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            email: string;
            name: string;
            handle: string;
            avatar_url: string | null;
          }>
        }),
    supabase
      .from("friend_requests")
      .select("id,sender_id,profiles!friend_requests_sender_id_fkey(id,email,name,handle,avatar_url)")
      .eq("receiver_id", identity.id)
      .eq("status", "pending"),
    supabase
      .from("friend_requests")
      .select("id,receiver_id,profiles!friend_requests_receiver_id_fkey(id,email,name,handle,avatar_url)")
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
    online: false,
    avatarUrl: profile.avatar_url ?? null
  }));

  const incomingRequests: FriendRequest[] = (incomingRows ?? []).map((row) => {
    const sender = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      senderId: sender.id,
      senderName: sender.name,
      senderHandle: sender.handle,
      senderEmail: sender.email,
      senderAvatarUrl: sender.avatar_url ?? null
    };
  });

  const outgoingRequests: FriendRequest[] = (outgoingRows ?? []).map((row) => {
    const receiver = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      senderId: receiver.id,
      senderName: receiver.name,
      senderHandle: receiver.handle,
      senderEmail: receiver.email,
      senderAvatarUrl: receiver.avatar_url ?? null
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
        friendAvatarUrl: friend.avatarUrl ?? null,
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

  const { data: target } = await supabase.from("profiles").select("id").eq("email", trimmed).single();

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

  const { data: thread } = await supabase.from("direct_threads").insert({}).select("id").single();

  if (thread) {
    await supabase.from("direct_thread_members").insert([
      { thread_id: thread.id, profile_id: request.sender_id },
      { thread_id: thread.id, profile_id: request.receiver_id }
    ]);

    return thread.id;
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
    .select("id,thread_id,author_id,author,handle,body,timestamp")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return getMemoryDirectMessages(threadId);
  }

  const attachmentMap = await getMessageAttachmentsMap(
    data.map((row) => row.id),
    "direct_message_attachments",
    "direct_message_id"
  );
  const profileMap = await getProfileRows(Array.from(new Set(data.map((row) => row.author_id))));

  return data.map((row) => ({
    id: row.id,
    channelId: row.thread_id,
    authorId: row.author_id,
    author: row.author,
    handle: row.handle,
    body: row.body,
    timestamp: row.timestamp,
    attachments: attachmentMap.get(row.id) ?? [],
    authorAvatarUrl: profileMap.get(row.author_id)?.avatar_url ?? null,
    canModerate: row.author_id === identity.id
  }));
}

export async function addDirectMessage(
  threadId: string,
  body: string,
  identity: AuthIdentity,
  attachmentUrl?: string | null
): Promise<Message> {
  const supabase = await assertDirectThreadAccess(threadId, identity);

  if (!supabase) {
    return addMemoryDirectMessage(threadId, body, identity);
  }

  const trimmed = body.trim();
  const trimmedAttachment = attachmentUrl?.trim() ?? "";

  if (!trimmed && !trimmedAttachment) {
    throw new Error("Message body or attachment is required.");
  }

  const timestamp = formatTimestamp(new Date());

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      author_id: identity.id,
      author: identity.name,
      handle: identity.handle,
      body: trimmed || "Attachment",
      timestamp
    })
    .select("id,thread_id,author_id,author,handle,body,timestamp")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save direct message.");
  }

  const attachments = trimmedAttachment
    ? [{ id: `${data.id}-attachment`, ...createAttachment(trimmedAttachment) }]
    : [];

  if (attachments.length) {
    await supabase.from("direct_message_attachments").insert(
      attachments.map((attachment) => ({
        direct_message_id: data.id,
        kind: attachment.kind,
        url: attachment.url,
        name: attachment.name
      }))
    );
  }

  return {
    id: data.id,
    channelId: data.thread_id,
    authorId: data.author_id,
    author: data.author,
    handle: data.handle,
    body: data.body,
    timestamp: data.timestamp,
    attachments,
    authorAvatarUrl: identity.avatarUrl ?? null,
    canModerate: true
  };
}

export async function createServer(identity: AuthIdentity, name: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Server creation requires Supabase.");
  }

  const trimmed = name.trim();

  if (trimmed.length < 3) {
    throw new Error("Server name must be at least 3 characters.");
  }

  const id = `${slugify(trimmed)}-${crypto.randomUUID().slice(0, 8)}`;
  const accentChoices = [
    "from-[#ff3b5f] to-[#ff8a5b]",
    "from-[#7bf6ff] to-[#6aa9ff]",
    "from-[#ff7a18] to-[#ff3c78]",
    "from-[#61dafb] to-[#7b61ff]"
  ];

  await supabase.from("servers").insert({
    id,
    name: trimmed,
    initials: getInitials(trimmed),
    accent: accentChoices[Math.floor(Math.random() * accentChoices.length)],
    owner_id: identity.id,
    sort_order: Date.now()
  });

  await supabase.from("server_memberships").upsert({
    server_id: id,
    profile_id: identity.id,
    role: "owner"
  });

  await supabase.from("channels").insert([
    { id: `${id}-general`, server_id: id, name: "general", kind: "text", sort_order: 1 },
    { id: `${id}-screenshots`, server_id: id, name: "screenshots", kind: "text", sort_order: 2 },
    { id: `${id}-lounge`, server_id: id, name: "lounge", kind: "voice", sort_order: 3 }
  ]);

  return id;
}

export async function createServerInvite(identity: AuthIdentity, serverId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Invites require Supabase.");
  }

  const server = await assertServerMembership(serverId, identity);

  if (server?.owner_id !== identity.id) {
    throw new Error("Only the server owner can create invites.");
  }

  const code = Math.random().toString(36).slice(2, 10).toUpperCase();

  await supabase.from("server_invites").upsert({
    code,
    server_id: serverId,
    created_by: identity.id
  });

  return { code, serverId };
}

export async function joinServerByInvite(identity: AuthIdentity, code: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Invites require Supabase.");
  }

  const trimmed = code.trim().toUpperCase();
  const { data: invite } = await supabase
    .from("server_invites")
    .select("code,server_id")
    .eq("code", trimmed)
    .maybeSingle();

  if (!invite) {
    throw new Error("Invite code not found.");
  }

  const { data: ban } = await supabase
    .from("server_bans")
    .select("id")
    .eq("server_id", invite.server_id)
    .eq("profile_id", identity.id)
    .maybeSingle();

  if (ban) {
    throw new Error("You are banned from this server.");
  }

  await supabase.from("server_memberships").upsert({
    server_id: invite.server_id,
    profile_id: identity.id,
    role: "member"
  });

  return invite.server_id;
}

export async function moderateServerMember(
  identity: AuthIdentity,
  serverId: string,
  targetProfileId: string,
  action: "kick" | "ban"
) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Moderation requires Supabase.");
  }

  const ownerAccess = await canModerateServer(identity, serverId);

  if (!ownerAccess) {
    throw new Error("Only the server owner can moderate this server.");
  }

  if (targetProfileId === identity.id) {
    throw new Error("You cannot moderate yourself.");
  }

  await supabase.from("server_memberships").delete().eq("server_id", serverId).eq("profile_id", targetProfileId);

  if (action === "ban") {
    await supabase.from("server_bans").upsert({
      server_id: serverId,
      profile_id: targetProfileId,
      created_by: identity.id
    });
  }

  await supabase.from("moderation_actions").insert({
    server_id: serverId,
    actor_id: identity.id,
    target_profile_id: targetProfileId,
    action
  });
}
