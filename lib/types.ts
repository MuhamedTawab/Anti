export type MemberStatus = "online" | "idle" | "focus";

export type ChannelKind = "text" | "voice";

export type AttachmentKind = "image" | "link";

export interface MessageAttachment {
  id: string;
  kind: AttachmentKind;
  url: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId?: string | null;
  author: string;
  handle: string;
  body: string;
  timestamp: string;
  createdAt?: string;
  attachments?: MessageAttachment[];
  authorAvatarUrl?: string | null;
  canModerate?: boolean;
  optimistic?: boolean;
}

export interface Channel {
  id: string;
  serverId?: string;
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
  avatarUrl?: string | null;
}

export interface Server {
  id: string;
  name: string;
  initials: string;
  accent: string;
  ownerId?: string | null;
  role?: "owner" | "member" | "public";
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
  avatarUrl?: string | null;
  bio?: string;
}

export interface Friend {
  id: string;
  name: string;
  handle: string;
  email: string;
  online: boolean;
  avatarUrl?: string | null;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderEmail: string;
  senderAvatarUrl?: string | null;
}

export interface DirectThread {
  id: string;
  friendId: string;
  friendName: string;
  friendHandle: string;
  lastMessage: string | null;
  friendAvatarUrl?: string | null;
}

export interface SocialPayload {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  directThreads: DirectThread[];
}

export interface ServerInvite {
  code: string;
  serverId: string;
}
