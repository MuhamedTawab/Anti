"use client";

import { Mic, MicOff, Headphones, PhoneOff } from "lucide-react";
import clsx from "clsx";

import { ChannelList } from "@/components/channel-list";
import { ChatPanel } from "@/components/chat-panel";
import { PromptModal } from "@/components/prompt-modal";
import { ServerRail } from "@/components/server-rail";
import { VoicePanel } from "@/components/voice-panel";
import { AuthPanel } from "@/components/auth-panel";
import { SocialPanel } from "@/components/social-panel";
import { useBlaze } from "@/lib/context";
import { BlazeProvider } from "@/components/blaze-provider";
import type { BootstrapPayload } from "@/lib/types";

export function AppShell({ initialData }: { initialData: BootstrapPayload }) {
  return (
    <BlazeProvider initialData={initialData}>
      <AppLayout />
    </BlazeProvider>
  );
}

function AppLayout() {
  const {
    currentUser,
    data,
    activeServerId,
    viewMode,
    setViewMode,
    setActiveThreadId,
    joinedVoiceRoomId,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    handleVoiceToggle,
    handleCreateServer,
    handleJoinInvite,
    profileName,
    profileHandle,
    profileAvatarUrl,
    profileBio,
    handleProfileNameChange,
    handleProfileHandleChange,
    handleProfileAvatarUrlChange,
    handleProfileBioChange,
    handleSaveProfile,
    createServerModalOpen,
    setCreateServerModalOpen,
    joinInviteModalOpen,
    setJoinInviteModalOpen,
    activeInviteCode,
    setActiveInviteCode,
    activeServer,
    activeTextChannel,
    activeVoiceChannel,
    handleModerateMember
  } = useBlaze();

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0d0f] text-white">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] bg-clip-text text-transparent">
              Blaze
            </h1>
            <p className="mt-2 text-sm text-[#9da0a7]">
              Join the conversation.
            </p>
          </div>
          <AuthPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0d0d0f] text-[#f2f3f5] overflow-hidden selection:bg-[#ff3b5f]/30">
      {/* Modals */}
      <PromptModal
        open={createServerModalOpen}
        title="Create a Space"
        description="Give your new space a personality with a name."
        placeholder="Space name"
        confirmLabel="Create Space"
        onCancel={() => setCreateServerModalOpen(false)}
        onConfirm={handleCreateServer}
      />

      <PromptModal
        open={joinInviteModalOpen}
        title="Join a Space"
        description="Enter an invite code to join an existing space."
        placeholder="Invite code (e.g. kH29sX)"
        confirmLabel="Join Space"
        onCancel={() => setJoinInviteModalOpen(false)}
        onConfirm={handleJoinInvite}
      />

      {activeInviteCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#16171a] p-6 shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-white">Share Your Space</h3>
            <p className="mt-2 text-sm text-[#9da0a7]">
              Anyone with this code can join your space.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="w-full rounded-xl bg-black/40 p-5 text-center border border-white/5">
                <span className="font-mono text-3xl font-bold tracking-widest text-[#ff3b5f]">
                  {activeInviteCode}
                </span>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-[#9da0a7] font-medium">Invite Code</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeInviteCode);
                  setActiveInviteCode(null);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-[#ff3b5f]/20"
              >
                Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main UI */}
      <ServerRail />

      {viewMode === "profile" ? (
        <>
          <ChannelList />
          <main className="flex flex-1 flex-col bg-[#111214] p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <AuthPanel />
            </div>
          </main>
        </>
      ) : viewMode === "channel" ? (
        <>
          <ChannelList />

          <main className="flex flex-1 flex-col bg-[#111214] shadow-2xl relative z-10">
            <ChatPanel
              title={activeTextChannel?.name ?? "general"}
              isOwner={activeServer?.role === "owner"}
              onModerateMember={handleModerateMember}
            />

            {/* Global Voice Status Bar — stays visible across channels */}
            {joinedVoiceRoomId && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#1e1f22]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md border border-white/5 animate-in slide-in-from-bottom-8 duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-[#23a559] animate-pulse shadow-[0_0_8px_#23a559]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9da0a7]">Voice Connected</span>
                    <span className="text-[11px] font-medium text-white truncate max-w-[120px]">
                      {data.servers.find(s => s.id === activeServerId)?.channels.find(c => c.id === joinedVoiceRoomId)?.name || 'General'}
                    </span>
                  </div>
                </div>

                <div className="mx-3 h-6 w-px bg-white/10" />

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={clsx(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95",
                      isMuted ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
                    )}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button
                    onClick={() => setIsDeafened(!isDeafened)}
                    className={clsx(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95",
                      isDeafened ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
                    )}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                  >
                    {isDeafened ? <MicOff size={18} /> : <Headphones size={18} />}
                  </button>
                  <button
                    onClick={() => handleVoiceToggle(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#da373c]/10 text-[#da373c] transition-all hover:bg-[#da373c] hover:text-white hover:scale-105 active:scale-95"
                    title="Disconnect"
                  >
                    <PhoneOff size={18} />
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className="hidden w-64 flex-col bg-[#111214] border-l border-white/5 xl:flex">
            {activeVoiceChannel ? (
              <VoicePanel />
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="border-b border-white/5 p-4 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#9da0a7]">Members</h3>
                </div>
                {/* 
                  Simple member list if not in a voice channel. 
                  In a real app, this would be computed from presence.
                */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale uppercase tracking-widest text-[10px] text-center">
                    <Mic size={32} className="mb-4" />
                    <p>Select a signal room<br/>to see members</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      ) : (
        <SocialPanel />
      )}
    </div>
  );
}
