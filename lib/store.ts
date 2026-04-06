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

const serverSeed: Server[] = [
  {
    id: "hq",
    name: "Anti HQ",
    initials: "AH",
    accent: "from-[#ff3b5f] to-[#ff8a5b]",
    channels: [
      { id: "welcome", name: "welcome", kind: "text", unread: 4 },
      { id: "build-log", name: "build-log", kind: "text", unread: 2 },
      { id: "ideas", name: "ideas", kind: "text" },
      { id: "war-room", name: "war-room", kind: "voice", members: 6 },
      { id: "late-night", name: "late-night", kind: "voice", members: 2 }
    ]
  },
  {
    id: "design",
    name: "Signal Lab",
    initials: "SL",
    accent: "from-[#7bf6ff] to-[#6aa9ff]",
    channels: [
      { id: "moodboard", name: "moodboard", kind: "text", unread: 1 },
      { id: "feedback", name: "feedback", kind: "text" },
      { id: "listening-room", name: "listening-room", kind: "voice", members: 3 }
    ]
  }
];

const messageSeed: Record<string, Message[]> = {
  welcome: [],
  "build-log": [],
  ideas: [],
  moodboard: [],
  feedback: []
};

const memberSeed: Record<string, Member[]> = {
  "war-room": [],
  "late-night": [],
  "listening-room": []
};

interface StoreState {
  servers: Server[];
  messages: Record<string, Message[]>;
  members: Record<string, Member[]>;
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  directThreads: DirectThread[];
  directMessages: Record<string, Message[]>;
}

function getStore(): StoreState {
  return {
    servers: structuredClone(serverSeed),
    messages: structuredClone(messageSeed),
    members: structuredClone(memberSeed),
    friends: [] as Friend[],
    incomingRequests: [] as FriendRequest[],
    outgoingRequests: [] as FriendRequest[],
    directThreads: [] as DirectThread[],
    directMessages: {} as Record<string, Message[]>
  };
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function getBootstrap(): BootstrapPayload {
  return structuredClone(getStore());
}

export function getMessages(channelId: string): Message[] {
  return structuredClone(getStore().messages[channelId] ?? []);
}

export function addMessage(
  channelId: string,
  body: string,
  identity?: Pick<AuthIdentity, "name" | "handle">
): Message {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new Error("Message body is required.");
  }

  const message: Message = {
    id: `${channelId}-${Date.now()}`,
    channelId,
    author: identity?.name ?? "You",
    handle: identity?.handle ?? "@you",
    body: trimmed,
    timestamp: formatTimestamp(new Date())
  };

  if (!getStore().messages[channelId]) {
    getStore().messages[channelId] = [];
  }

  getStore().messages[channelId].push(message);

  return structuredClone(message);
}

export function getVoiceMembers(roomId: string): Member[] {
  return structuredClone(getStore().members[roomId] ?? []);
}

export function ensureProfile(identity: AuthIdentity) {
  return identity;
}

export function getSocialData(): SocialPayload {
  return structuredClone({
    friends: getStore().friends,
    incomingRequests: getStore().incomingRequests,
    outgoingRequests: getStore().outgoingRequests,
    directThreads: getStore().directThreads
  });
}

export function sendFriendRequest(_identity: AuthIdentity, _email: string) {
  return null;
}

export function respondToFriendRequest(_identity: AuthIdentity, _requestId: string, _action: "accept" | "decline") {
  return null;
}

export function getDirectMessages(threadId: string) {
  return structuredClone(getStore().directMessages[threadId] ?? []);
}

export function addDirectMessage(threadId: string, body: string, identity: AuthIdentity) {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new Error("Message body is required.");
  }

  const message: Message = {
    id: `${threadId}-${Date.now()}`,
    channelId: threadId,
    author: identity.name,
    handle: identity.handle,
    body: trimmed,
    timestamp: formatTimestamp(new Date())
  };

  if (!getStore().directMessages[threadId]) {
    getStore().directMessages[threadId] = [];
  }

  getStore().directMessages[threadId].push(message);
  return structuredClone(message);
}
