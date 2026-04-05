export type MemberStatus = "online" | "idle" | "focus";

export type ChannelKind = "text" | "voice";

export interface Message {
  id: string;
  channelId: string;
  author: string;
  handle: string;
  body: string;
  timestamp: string;
  optimistic?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  unread?: number;
  members?: number;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  status: MemberStatus;
}

export interface Server {
  id: string;
  name: string;
  initials: string;
  accent: string;
  channels: Channel[];
}

export interface VoiceRoomState {
  roomId: string;
  joined: boolean;
  participants: number;
}

export interface BootstrapPayload {
  servers: Server[];
  messages: Record<string, Message[]>;
  members: Record<string, Member[]>;
}

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
  handle: string;
}
