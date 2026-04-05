import type { AuthIdentity, BootstrapPayload, Member, Message, Server } from "@/lib/types";

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
  welcome: [
    {
      id: "welcome-1",
      channelId: "welcome",
      author: "Maya",
      handle: "@maya",
      body: "Welcome in. Keep comms tight, keep channels clean, and jump into voice when the squad is active.",
      timestamp: "09:02"
    }
  ],
  "build-log": [
    {
      id: "build-log-1",
      channelId: "build-log",
      author: "Maya",
      handle: "@maya",
      body: "We should treat voice rooms like lightweight spaces, not meetings. Join fast, speak fast, leave fast.",
      timestamp: "09:12"
    },
    {
      id: "build-log-2",
      channelId: "build-log",
      author: "Idris",
      handle: "@idris",
      body: "Chat history is flowing. Next step is role-aware permissions and WebRTC signaling hooks for voice channels.",
      timestamp: "09:16"
    },
    {
      id: "build-log-3",
      channelId: "build-log",
      author: "Nora",
      handle: "@nora",
      body: "The UI should make voice feel alive even before someone joins. Speaking activity, room counts, and quick join need to be obvious.",
      timestamp: "09:21"
    }
  ],
  ideas: [
    {
      id: "ideas-1",
      channelId: "ideas",
      author: "Sami",
      handle: "@sami",
      body: "Push-to-talk and game-party presence can become signature features once the chat base is stable.",
      timestamp: "10:03"
    }
  ],
  moodboard: [
    {
      id: "moodboard-1",
      channelId: "moodboard",
      author: "Nora",
      handle: "@nora",
      body: "Keep the palette nearly black, then let the red and cyan accents do the heavy lifting.",
      timestamp: "11:08"
    }
  ],
  feedback: [
    {
      id: "feedback-1",
      channelId: "feedback",
      author: "Idris",
      handle: "@idris",
      body: "Minimal is good, but action states still need to feel strong enough for a gaming audience.",
      timestamp: "11:17"
    }
  ]
};

const memberSeed: Record<string, Member[]> = {
  "war-room": [
    { id: "u1", name: "Maya", role: "Founder", status: "online" },
    { id: "u2", name: "Idris", role: "Platform", status: "focus" },
    { id: "u3", name: "Nora", role: "Design", status: "online" },
    { id: "u4", name: "Sami", role: "Moderation", status: "idle" }
  ],
  "late-night": [
    { id: "u5", name: "Rin", role: "Night Ops", status: "online" },
    { id: "u6", name: "Kareem", role: "Builder", status: "focus" }
  ],
  "listening-room": [
    { id: "u7", name: "Lina", role: "Audio", status: "online" },
    { id: "u8", name: "Tariq", role: "UI", status: "idle" },
    { id: "u9", name: "Ash", role: "Mods", status: "online" }
  ]
};

const store = {
  servers: structuredClone(serverSeed),
  messages: structuredClone(messageSeed),
  members: structuredClone(memberSeed)
};

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function getBootstrap(): BootstrapPayload {
  return structuredClone(store);
}

export function getMessages(channelId: string): Message[] {
  return structuredClone(store.messages[channelId] ?? []);
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

  if (!store.messages[channelId]) {
    store.messages[channelId] = [];
  }

  store.messages[channelId].push(message);

  return structuredClone(message);
}

export function getVoiceMembers(roomId: string): Member[] {
  return structuredClone(store.members[roomId] ?? []);
}
