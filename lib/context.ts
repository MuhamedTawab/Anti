import { createContext, useContext } from "react";
import type { 
  AuthIdentity, 
  BootstrapPayload, 
  SocialPayload, 
  Message, 
  Server, 
  Channel, 
  Member 
} from "./types";

export interface BlazeContextType {
  // Auth state
  currentUser: AuthIdentity | null;
  accessToken: string | null;
  authLoading: boolean;
  authMessage: string | null;
  setAuthMessage: (msg: string | null) => void;
  getAuthHeaders: () => Record<string, string> | null;

  // Data state
  data: BootstrapPayload;
  setData: React.Dispatch<React.SetStateAction<BootstrapPayload>>;
  socialData: SocialPayload;
  setSocialData: React.Dispatch<React.SetStateAction<SocialPayload>>;
  
  // Navigation state
  activeServerId: string | null;
  setActiveServerId: (id: string | null) => void;
  activeTextChannelId: string;
  setActiveTextChannelId: (id: string) => void;
  activeVoiceChannelId: string;
  setActiveVoiceChannelId: (id: string) => void;
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  viewMode: "channel" | "dm" | "profile";
  setViewMode: (mode: "channel" | "dm" | "profile") => void;

  // V18: Presence Intelligence
  globalTyping: Record<string, { channelId: string; expiresAt: number }>;
  globalPresence: Record<string, { serverId: string; roomId: string; roomName: string } | null>;

  // Active objects (derived)
  activeServer: Server | null;
  activeTextChannel: Channel | null;
  activeVoiceChannel: Channel | null;
  activeThread: any | null; // DirectThread
  activeChatKey: string;
  displayedMessages: Message[];
  activeMessages: Message[];
  activeMembers: Member[];
  onlineMembers: Member[];
  onlineFriendIds: string[];
  activeTypingMembers: string[];
  unreadCounts: Record<string, number>;

  // UI state
  error: string | null;
  setError: (err: string | null) => void;
  composerValue: string;
  setComposerValue: (val: string) => void;
  attachmentUrl: string;
  setAttachmentUrl: (url: string) => void;
  attachmentOpen: boolean;
  setAttachmentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSending: boolean;
  isPending: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;

  // Voice state
  joinedVoiceRoomId: string | null;
  isVoiceConnecting: boolean;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isDeafened: boolean;
  setIsDeafened: React.Dispatch<React.SetStateAction<boolean>>;
  isPushToTalk: boolean;
  setIsPushToTalk: React.Dispatch<React.SetStateAction<boolean>>;
  isPushToTalkActive: boolean;
  voiceConnectionStatus: "idle" | "connecting" | "connected" | "reconnecting" | "failed";
  outputVolume: number;
  setOutputVolume: (vol: number) => void;
  signalLevels: number[];
  participantLevels: Record<string, number>;
  isScreenSharing: boolean;
  remoteVideoStreams: Record<string, MediaStream>;
  pushToTalkKey: string;
  setPushToTalkKey: (key: string) => void;
  isRecordingPTT: boolean;
  setIsRecordingPTT: (val: boolean) => void;

  // Handlers
  handleSendMessage: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  handleComposerChange: (val: string) => void;
  handleTextChannelSelect: (id: string) => void;
  handleVoiceChannelSelect: (id: string) => Promise<void>;
  handleServerSelect: (id: string) => Promise<void>;
  handleOpenThread: (id: string) => void;
  handleVoiceToggle: (id: string | null) => Promise<void>;
  handleScreenShareToggle: () => Promise<void>;
  handleCreateServer: (name: string) => Promise<void>;
  handleJoinInvite: (code: string) => Promise<void>;
  handleCreateInvite: () => Promise<void>;
  handleDeleteServer: (serverId: string) => Promise<void>;
  handleModerateMember: (targetId: string, action: "kick" | "ban") => Promise<void>;
  handleDeleteMessage: (id: string) => Promise<void>;
  handleSendFriendRequest: () => Promise<void>;
  handleRespondFriendRequest: (requestId: string, action: "accept" | "decline") => Promise<void>;
  handleHomeSelect: () => void;
  
  // Profile handlers
  profileName: string;
  profileHandle: string;
  profileAvatarUrl: string;
  profileBio: string;
  handleProfileNameChange: (val: string) => void;
  handleProfileHandleChange: (val: string) => void;
  handleProfileAvatarUrlChange: (val: string) => void;
  handleProfileBioChange: (val: string) => void;
  handleSaveProfile: () => Promise<void>;

  // Modals
  createServerModalOpen: boolean;
  setCreateServerModalOpen: (open: boolean) => void;
  joinInviteModalOpen: boolean;
  setJoinInviteModalOpen: (open: boolean) => void;
  activeInviteCode: string | null;
  setActiveInviteCode: (code: string | null) => void;
  friendEmail: string;
  setFriendEmail: (email: string) => void;

  // Kinetic Emoji Protocol
  activeReactions: Array<{ id: string; emoji: string; userId: string; userName: string }>;
  sendReaction: (emoji: string) => void;
}

export const BlazeContext = createContext<BlazeContextType | null>(null);

export function useBlaze() {
  const context = useContext(BlazeContext);
  if (!context) {
    throw new Error("useBlaze must be used within a BlazeProvider");
  }
  return context;
}
