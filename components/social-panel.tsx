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
               onClick={() => setActiveSocialTab("signals")}
               className={clsx(
                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                 activeSocialTab === "signals" ? "bg-white/10 text-white" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
               )}
             >
               Signals
             </button>
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
          
          {activeSocialTab === "signals" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                   <Heart size={16} className="text-[#ff3b5f]" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da0a7]">Active Signals — {socialData.directThreads.length}</h3>
                 </div>
                 <div className="h-px flex-1 mx-4 bg-white/5" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {socialData.directThreads.map((thread) => {
                    const isOnline = onlineFriendIds.includes(thread.friendId);
                    return (
                      <button
                        key={thread.id}
                        onClick={() => handleOpenThread(thread.friendId)}
                        className="flex items-center justify-between group rounded-[2.5rem] border border-white/5 bg-[#1e1f22]/30 p-6 transition-all hover:bg-[#1e1f22]/80 hover:border-[#ff3b5f]/30 hover:scale-[1.01] active:scale-[0.99] text-left"
                      >
                         <div className="flex items-center gap-6 min-w-0 flex-1">
                            <div className="relative flex-shrink-0">
                               <div className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 flex items-center justify-center overflow-hidden">
                                  {thread.friendAvatarUrl ? (
                                    <img src={thread.friendAvatarUrl} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-xl font-black text-white/20">{thread.friendName.slice(0, 1)}</span>
                                  )}
                               </div>
                               <div className={clsx(
                                 "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[4px] border-[#111214] shadow-lg",
                                 isOnline ? "bg-[#23a559]" : "bg-[#9da0a7]/20"
                               )} />
                            </div>
                            <div className="min-w-0 flex-1">
                               <h4 className="text-lg font-black text-white tracking-tight group-hover:text-[#ff3b5f] transition-colors">{thread.friendName}</h4>
                               <p className="text-xs font-bold text-[#9da0a7] truncate opacity-60 mt-1">
                                 {thread.lastMessage || "Establish connection..."}
                               </p>
                            </div>
                         </div>
                         <div className="ml-4 p-3 rounded-2xl bg-white/5 text-[#9da0a7] group-hover:bg-[#ff3b5f] group-hover:text-white transition-all">
                            <ArrowUpRight size={20} />
                         </div>
                      </button>
                    )
                  })}

                  {socialData.directThreads.length === 0 && (
                    <div className="col-span-full py-24 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                       <MessageSquare size={48} className="mx-auto mb-6 text-[#9da0a7] opacity-20" />
                       <h3 className="text-sm font-black text-white uppercase tracking-widest">Atmosphere Silent</h3>
                       <p className="mt-2 text-[10px] font-bold text-[#9da0a7] uppercase tracking-[0.2em] opacity-40">No active signals intercepted in this sector.</p>
                       <button 
                         onClick={() => setActiveSocialTab("friends")}
                         className="mt-8 px-6 py-2.5 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                       >
                         Find Contact
                       </button>
                    </div>
                  )}
               </div>
            </div>
          )}
 Broadway;
        </div>
      </div>
    </div>
  );
}
