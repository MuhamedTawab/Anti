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
    activeSocialTab,
    setActiveSocialTab,
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
             <h2 className="text-sm font-bold text-white tracking-tight">Social Hub</h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <nav className="flex items-center gap-1">
             <button 
               onClick={() => setActiveSocialTab("friends")}
               className={clsx(
                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                 activeSocialTab === "friends" ? "bg-white/10 text-white" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
               )}
             >
               Friends
             </button>
             <button 
               onClick={() => setActiveSocialTab("pending")}
               className={clsx(
                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                 activeSocialTab === "pending" ? "bg-white/10 text-white" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
               )}
             >
               Pending
               {(incomingRequests.length > 0) && (
                 <span className="h-2 w-2 rounded-full bg-[#ff3b5f] shadow-[0_0_8px_#ff3b5f]" />
               )}
             </button>
             <button 
               onClick={() => setActiveSocialTab("blocked")}
               className={clsx(
                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                 activeSocialTab === "blocked" ? "bg-white/10 text-white" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
               )}
             >
               Blocked
             </button>
             <button 
               onClick={() => setActiveSocialTab("friends")} // Default to friends for Add Friend
               className="ml-2 px-3 py-1.5 rounded-lg bg-[#23a559] text-xs font-bold text-white shadow-lg shadow-[#23a559]/20 hover:scale-105 active:scale-95 transition-all"
             >
               Add Friend
             </button>
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8 space-y-10">
          
          {activeSocialTab === "friends" && (
            <>
              {/* Add Friend Section */}
              <section className="animate-in slide-in-from-top-4 duration-500">
                <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1e1f22] to-[#111214] p-8 shadow-2xl">
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
                        className="flex items-center gap-2 rounded-2xl bg-[#ff3b5f] px-8 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
                      >
                        <Send size={18} />
                        Send Request
                      </button>
                    </div>
                </div>
              </section>

              {/* Friends List */}
              <section className="space-y-4 animate-in fade-in duration-700 delay-200">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Online Members — {friends.filter(f => onlineFriendIds.includes(f.id)).length}</h3>
                  <div className="h-px flex-1 mx-4 bg-white/5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {friends.map((friend) => {
                    const isOnline = onlineFriendIds.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="group flex items-center justify-between rounded-2xl border border-white/5 bg-[#1e1f22]/50 p-4 transition-all hover:bg-[#1e1f22] hover:border-white/10"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                              {friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt={friend.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-[#9da0a7]">{friend.name.slice(0, 1)}</span>
                              )}
                            </div>
                            <div className={clsx(
                              "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#1e1f22]",
                              isOnline ? "bg-[#23a559]" : "bg-[#9da0a7] opacity-40"
                            )} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-[#ff3b5f] transition-colors">{friend.name}</p>
                            <p className="text-[10px] font-medium text-[#9da0a7] uppercase tracking-wider">{friend.handle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleOpenThread(friend.id)}
                             className="p-2.5 rounded-xl bg-white/5 text-[#9da0a7] hover:bg-[#ff3b5f] hover:text-white transition-all"
                           >
                              <MessageSquare size={18} />
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {friends.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                     <Users size={48} className="mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">No signals detected yet</p>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSocialTab === "pending" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Incoming Requests */}
              <section className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                   <ArrowDownLeft size={16} className="text-[#23a559]" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Incoming Requests</h3>
                   <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9da0a7]">
                           {req.senderAvatarUrl ? <img src={req.senderAvatarUrl} className="h-full w-full object-cover rounded-xl" /> : <UserPlus size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{req.senderName}</p>
                          <p className="text-[10px] font-bold text-[#9da0a7] uppercase">{req.senderHandle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRespondFriendRequest(req.id, "accept")}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#23a559]/20 text-[#23a559] hover:bg-[#23a559] hover:text-white transition-all"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleRespondFriendRequest(req.id, "decline")}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#da373c]/20 text-[#da373c] hover:bg-[#da373c] hover:text-white transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {incomingRequests.length === 0 && (
                    <p className="text-center py-8 text-[10px] font-bold text-[#9da0a7] uppercase tracking-widest opacity-30 italic">No incoming requests</p>
                  )}
                </div>
              </section>

              {/* Outgoing Requests */}
              <section className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                   <ArrowUpRight size={16} className="text-[#ff3b5f]" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Outgoing Signals</h3>
                   <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 gap-3 opacity-60">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-2xl border border-white/5 p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-[#9da0a7]">
                           <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{req.senderName || "Identity Pending"}</p>
                          <p className="text-[10px] font-bold text-[#9da0a7] uppercase">Signal Encrypted</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#9da0a7]">Waiting...</span>
                    </div>
                  ))}
                  {outgoingRequests.length === 0 && (
                    <p className="text-center py-8 text-[10px] font-bold text-[#9da0a7] uppercase tracking-widest opacity-30 italic">No active outgoing signals</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSocialTab === "blocked" && (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-500">
               <div className="h-20 w-20 rounded-full bg-black/40 flex items-center justify-center text-[#da373c] mb-6 border border-[#da373c]/20">
                  <Heart size={32} className="opacity-40" />
               </div>
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Isolation Chamber Empty</h3>
               <p className="mt-2 text-[10px] font-bold text-[#9da0a7] uppercase tracking-widest opacity-40">You haven't blocked any identities yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
