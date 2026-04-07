"use client";

import clsx from "clsx";
import { 
  Hash, 
  Headphones, 
  Shield, 
  Sparkles, 
  Ticket, 
  Users, 
  MessageSquare,
  Settings,
  MoreVertical,
  LogOut,
  Search,
  Plus
} from "lucide-react";

import { useNightlink } from "@/lib/context";
import type { Channel } from "@/lib/types";

function ChannelRow({
  channel,
  active,
  unreadCount = 0,
  onClick
}: {
  channel: Channel;
  active: boolean;
  unreadCount?: number;
  onClick: (channelId: string) => void;
}) {
  const Icon = channel.kind === "voice" ? Headphones : Hash;

  return (
    <button
      onClick={() => onClick(channel.id)}
      className={clsx(
        "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200",
        active
          ? "bg-[#ff3b5f]/10 text-white border-l-2 border-[#ff3b5f]"
          : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={16} className={clsx(active ? "text-[#ff3b5f]" : "opacity-50")} />
        <span className={clsx("text-sm font-bold uppercase tracking-tight", active ? "text-white" : "opacity-80")}>
          {channel.name}
        </span>
      </span>
      {channel.kind === "text" && unreadCount > 0 && !active ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b5f] px-1 text-[10px] font-black text-white shadow-lg shadow-[#ff3b5f]/20">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      {channel.kind === "voice" && (
        <div className="flex -space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
           {/* Visual indicator for voice members could go here */}
        </div>
      )}
    </button>
  );
}

export function ChannelList() {
  const {
    activeServer: server,
    activeTextChannelId,
    activeVoiceChannelId,
    handleTextChannelSelect: onTextSelect,
    handleVoiceChannelSelect: onVoiceSelect,
    handleCreateInvite: onCreateInvite,
    unreadCounts,
    setViewMode,
    setActiveThreadId,
    currentUser,
    socialData,
    activeThreadId,
    handleOpenThread,
    handleDeleteServer,
    globalTyping,
    globalPresence
  } = useNightlink();

  if (!server) {
    return (
      <section className="flex w-full flex-col bg-[#0d0d0f] border-r border-white/5 xl:w-[280px] z-10 animate-in slide-in-from-left-4 duration-300">
        <div className="p-5 border-b border-white/5">
           <button className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] font-bold text-[#9da0a7] transition-all hover:bg-white/10">
              <span>Find a conversation</span>
              <div className="flex items-center gap-1.5 opacity-40">
                <Search size={12} />
                <span className="text-[10px] font-mono">⌘K</span>
              </div>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-8 custom-scrollbar">
           {/* Navigation */}
           <div className="space-y-1">
              <button 
                onClick={() => {
                  setViewMode("dm");
                  setActiveThreadId(null);
                }}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  !activeThreadId ? "bg-[#ff3b5f]/10 text-white" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
                )}
              >
                 <Users size={18} className={!activeThreadId ? "text-[#ff3b5f]" : "opacity-50"} />
                 <span className="text-sm font-bold uppercase tracking-tight">Friends</span>
              </button>
           </div>

           {/* Direct Messages */}
           <div className="space-y-1">
              <div className="px-3 mb-2 flex items-center justify-between group">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9da0a7] opacity-50">Direct Messages</h3>
                <Plus size={14} className="text-[#9da0a7] opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-pointer" />
              </div>
              
              {socialData.directThreads.map((thread) => {
                const typing = globalTyping[thread.friendId];
                const presence = globalPresence[thread.friendId];
                const isSelected = activeThreadId === thread.id;

                return (
                  <button
                    key={thread.id}
                    onClick={() => handleOpenThread(thread.friendId)}
                    className={clsx(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                      isSelected
                        ? "bg-white/5 text-white"
                        : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                         {thread.friendAvatarUrl ? (
                           <img src={thread.friendAvatarUrl} className="h-full w-full object-cover" />
                         ) : (
                           <span className="text-[10px] font-bold">{thread.friendName.slice(0, 1)}</span>
                         )}
                      </div>
                      {presence && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#23a559] border-2 border-[#0d0d0f] animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-bold truncate w-full">{thread.friendName}</span>
                      <span className={clsx(
                        "text-[10px] font-medium truncate w-full transition-colors",
                        typing ? "text-[#f2a365] animate-pulse" : presence ? "text-[#23a559]" : "text-[#9da0a7] opacity-60"
                      )}>
                        {typing ? "is typing..." : presence ? `Live in ${presence.roomName}` : (thread.lastMessage || "Operation Active")}
                      </span>
                    </div>
                    {unreadCounts[thread.id] > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b5f] px-1 text-[10px] font-black text-white shadow-lg shadow-[#ff3b5f]/20">
                        {unreadCounts[thread.id] > 99 ? "99+" : unreadCounts[thread.id]}
                      </span>
                    )}
                  </button>
                );
              })}

              {socialData.directThreads.length === 0 && (
                <div className="py-10 px-4 text-center opacity-20 italic">
                  <p className="text-[10px] font-bold uppercase tracking-widest">No private signals detected</p>
                </div>
              )}
           </div>
        </div>

        {/* User Footer */}
        <div className="mt-auto p-4 border-t border-white/5 bg-[#080809]">
          <div className="flex items-center gap-3 px-1">
            <button 
              onClick={() => setViewMode("profile")}
              className="group relative h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff3b5f] to-[#ff8a5b] p-0.5 transition-transform hover:scale-105 active:scale-95"
            >
              <div className="h-full w-full rounded-[10px] bg-[#0d0d0f] flex items-center justify-center overflow-hidden">
                 {currentUser?.avatarUrl ? (
                   <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                 ) : (
                   <span className="text-[10px] font-bold text-white uppercase">{currentUser?.name.slice(0, 2)}</span>
                 )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#23a559] border-2 border-[#080809]" />
            </button>
            
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate">{currentUser?.name}</span>
              <span className="text-[9px] font-bold text-[#9da0a7] uppercase tracking-tighter opacity-60 truncate">
                {currentUser?.handle}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewMode("profile")}
                className="p-1.5 text-[#9da0a7] hover:text-white transition-colors"
                title="Identity Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const textChannels = server.channels.filter((c) => c.kind === "text");
  const voiceChannels = server.channels.filter((c) => c.kind === "voice");

  return (
    <section className="flex w-full flex-col bg-[#0d0d0f] border-r border-white/5 xl:w-[280px] z-10 transition-all">
      {/* Server Header */}
      <div className="p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-white group-hover:text-[#ff3b5f] transition-colors">{server.name}</h2>
          <MoreVertical size={14} className="text-[#9da0a7] opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        <div className="flex items-center gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-[#23a559]" />
           <span className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-wider opacity-60">Operations Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-8 custom-scrollbar">
        
        {/* Social Quick Access */}
        <div className="space-y-1">
           <button 
             onClick={() => {
                setViewMode("dm");
                setActiveThreadId(null);
             }}
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9da0a7] hover:bg-white/5 hover:text-white transition-all group"
           >
              <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-[#ff3b5f]/10 transition-colors">
                <Users size={16} />
              </div>
              <span className="text-sm font-bold uppercase tracking-tight">Social Lab</span>
           </button>
           <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9da0a7] hover:bg-white/5 hover:text-white transition-all group">
              <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-[#ff3b5f]/10 transition-colors">
                <Sparkles size={16} />
              </div>
              <span className="text-sm font-bold uppercase tracking-tight">Events</span>
           </button>
        </div>

        {/* Text Channels */}
        <div className="space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between group">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9da0a7] opacity-50">Comms Channels</h3>
            <Settings size={12} className="text-[#9da0a7] opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-pointer" />
          </div>
          {textChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              active={activeTextChannelId === channel.id}
              unreadCount={unreadCounts[channel.id]}
              onClick={onTextSelect}
            />
          ))}
        </div>

        {/* Voice Channels */}
        <div className="space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between group">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9da0a7] opacity-50">Signal Rooms</h3>
            <Settings size={12} className="text-[#9da0a7] opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-pointer" />
          </div>
          {voiceChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              active={activeVoiceChannelId === channel.id}
              onClick={onVoiceSelect}
            />
          ))}
        </div>

        {/* Server Intel */}
        <div className="px-3">
           <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#ff3b5f]">
                 <Shield size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Protocol</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#9da0a7] font-medium italic opacity-80">
                Low-noise comms active. All signals encrypted. Ready for late-night sessions.
              </p>
              <div className="space-y-2">
                 <button 
                   onClick={onCreateInvite}
                   className="w-full py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-[#9da0a7] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                 >
                   Create Invite
                 </button>
                 {currentUser?.id === server.ownerId && (
                   <button 
                     onClick={() => {
                       if (confirm("Execute Destruction Protocol? This will permanently wipe this space.")) {
                         handleDeleteServer(server.id);
                       }
                     }}
                     className="w-full py-2 rounded-xl bg-[#ff3b5f]/5 text-[9px] font-black uppercase tracking-[0.2em] text-[#ff3b5f]/60 hover:bg-[#ff3b5f]/10 hover:text-[#ff3b5f] transition-all border border-[#ff3b5f]/10"
                   >
                     Delete Server
                   </button>
                 )}
               </div>
           </div>
        </div>
      </div>

      {/* User Footer */}
      <div className="mt-auto p-4 border-t border-white/5 bg-[#080809]">
        <div className="flex items-center gap-3 px-1">
          <button 
            onClick={() => setViewMode("profile")}
            className="group relative h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff3b5f] to-[#ff8a5b] p-0.5 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="h-full w-full rounded-[10px] bg-[#0d0d0f] flex items-center justify-center overflow-hidden">
               {currentUser?.avatarUrl ? (
                 <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
               ) : (
                 <span className="text-[10px] font-bold text-white uppercase">{currentUser?.name.slice(0, 2)}</span>
               )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#23a559] border-2 border-[#080809]" />
          </button>
          
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-white truncate">{currentUser?.name}</span>
            <span className="text-[9px] font-bold text-[#9da0a7] uppercase tracking-tighter opacity-60 truncate">
              {currentUser?.handle}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setViewMode("profile")}
              className="p-1.5 text-[#9da0a7] hover:text-white transition-colors"
              title="Identity Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
