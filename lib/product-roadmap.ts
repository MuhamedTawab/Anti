export const roadmap = [
  {
    title: "Foundation",
    items: [
      "Next.js web app shell with server, channel, chat, and voice layouts",
      "Auth, profile, and session model",
      "PostgreSQL schema for users, servers, channels, messages, roles, memberships"
    ]
  },
  {
    title: "Realtime Chat",
    items: [
      "Socket.IO gateway for channel messaging and presence",
      "Typing indicators, unread tracking, and read state",
      "Moderation actions, audit events, and channel permissions"
    ]
  },
  {
    title: "Voice",
    items: [
      "WebRTC signaling for browser voice rooms",
      "Join, leave, mute, speaking state, and room capacity",
      "Migration path to LiveKit or mediasoup once rooms need stronger scaling"
    ]
  }
];
