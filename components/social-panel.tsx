"use client";

import { 
  Check, 
  MailPlus, 
  MessageSquare, 
  Send, 
  UserPlus, 
  X, 
  Heart, 
  ShieldIcon, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock 
} from "lucide-react";
import clsx from "clsx";

import { useNightlink } from "@/lib/context";
import { ChatPanel } from "./chat-panel";
import { AuthPanel } from "./auth-panel";

export function SocialPanel() {
  const {
    socialData,
    onlineFriendIds,
    handleOpenThread,
    handleSendFriendRequest,
    friendEmail,
    setFriendEmail,
    handleRespondFriendRequest,
    activeThreadId,
    activeThread,
    setViewMode,
    authLoading
  } = useNightlink();

  const { friends, incomingRequests, outgoingRequests } = socialData;

  // If a thread is active, we show the DM chat instead of the friends list
  if (activeThreadId) {
    return (
      <main className="flex flex-1 flex-col bg-[#111214] shadow-2xl relative z-10 transition-all duration-300 animate-in fade-in">
        <ChatPanel
          title={activeThread?.friendName ?? "private-chat"}
          isOwner={false}
        />
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#111214] overflow-hidden">
      {/* Social Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-[#111214]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setViewMode("channel")}>
             <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-[#ff3b5f]/10 transition-colors">
                <Users size={18} className="text-[#9da0a7] group-hover:text-[#ff3b5f]" />
             </div>
             <h2 className="text-sm font-bold text-white tracking-tight uppercase tracking-[0.2em]">Social Hub</h2>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-8 space-y-12">
          
          {/* 1. Add Friend Protocol */}
          <section className="animate-in slide-in-from-top-4 duration-500">
             <div className="rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-[#1e1f22] to-[#111214] p-8 shadow-2xl">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <MailPlus size={24} className="text-[#ff3b5f]" />
                      Expand Your Network
                    </h3>
                    <p className="mt-1 text-sm text-[#9da0a7]">Invite friends to Nightlink by their email address.</p>
                  </div>
                  <ShieldIcon size={20} className="text-[#9da0a7] opacity-20" />
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <input
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      placeholder="Enter email address (e.g. friend@example.com)"
                      className="w-full rounded-2xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30 placeholder:text-white/20"
                    />
                  </div>
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={!friendEmail || authLoading}
                    className="flex items-center gap-2 rounded-2xl bg-[#ff3b5f] px-8 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 shadow-lg shadow-[#ff3b5f]/20"
                  >
                    <Send size={18} />
                    Send Request
                  </button>
                </div>
             </div>
          </section>

          {/* 2. Priority: Incoming Requests */}
          {incomingRequests.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="flex items-center gap-4 px-2">
                  <ArrowDownLeft size={16} className="text-[#23a559]" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Pending Requests — {incomingRequests.length}</h3>
                  <div className="h-px flex-1 bg-white/5" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-3xl border border-[#23a559]/20 bg-[#23a559]/5 p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-[#9da0a7] overflow-hidden">
                           {req.senderAvatarUrl ? <img src={req.senderAvatarUrl} className="h-full w-full object-cover" /> : <UserPlus size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{req.senderName}</p>
                          <p className="text-[10px] font-bold text-[#9da0a7] uppercase">{req.senderHandle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRespondFriendRequest(req.id, "accept")}
                           className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#23a559] text-white hover:scale-105 transition-all"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleRespondFriendRequest(req.id, "decline")}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-[#da373c] hover:bg-[#da373c] hover:text-white transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* 3. Friends List */}
          <section className="space-y-6 animate-in fade-in duration-1000 delay-300">
             <div className="flex items-center gap-4 px-2">
                <Users size={16} className="text-[#9da0a7] opacity-40" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Friends — {friends.length}</h3>
                <div className="h-px flex-1 bg-white/5" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {friends.map((friend) => {
                  const isOnline = onlineFriendIds.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      className="group flex items-center justify-between rounded-2xl border border-white/5 bg-[#1e1f22]/50 p-4 transition-all hover:bg-[#1e1f22] hover:border-white/10"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                            {friend.avatarUrl ? (
                              <img src={friend.avatarUrl} alt={friend.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-[#9da0a7]">{friend.name.slice(0, 1)}</span>
                            )}
                          </div>
                          <div className={clsx(
                            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111214]",
                            isOnline ? "bg-[#23a559]" : "bg-[#9da0a7] opacity-40"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{friend.name}</p>
                          <p className="text-[9px] font-medium text-[#9da0a7] uppercase tracking-wider truncate">{friend.handle}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleOpenThread(friend.id)}
                        className="p-2 rounded-xl bg-white/5 text-[#9da0a7] hover:bg-[#ff3b5f] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                         <MessageSquare size={14} />
                      </button>
                    </div>
                  );
                })}
             </div>

             {friends.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12 text-center opacity-20 bg-white/[0.01] rounded-[2rem] border-2 border-dashed border-white/5">
                  <Heart size={32} className="mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No friends detected</p>
               </div>
             )}
          </section>

        </div>
      </div>
    </div>
  );
}
