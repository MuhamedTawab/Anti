"use client";

import { Check, MailPlus, MessageSquare, Send, UserPlus, X, Heart, ShieldIcon, Users } from "lucide-react";
import clsx from "clsx";

import { useNightlink } from "@/lib/context";
import { ChatPanel } from "./chat-panel";

export function SocialPanel({
  viewMode: initialViewMode = "friends"
}: {
  viewMode?: "friends" | "requests";
}) {
  const {
    socialData,
    onlineFriendIds,
    handleOpenThread,
    handleSendFriendRequest,
    friendEmail,
    handleComposerChange, // Note: actually uses setFriendEmail in original social logic, but I'll use context state
    setFriendEmail,
    handleRespondFriendRequest,
    activeThreadId,
    activeThread,
    displayedMessages,
    composerValue,
    handleSendMessage,
    isSending,
    error,
    setError,
    attachmentUrl,
    setAttachmentUrl,
    attachmentOpen,
    setAttachmentOpen,
    currentUser,
    unreadCounts,
    setViewMode
  } = useNightlink();

  const { friends, incomingRequests, outgoingRequests, directThreads } = socialData;

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
             <button className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold text-white">Friends</button>
             <button className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-xs font-bold text-[#9da0a7] hover:text-white transition-all">Pending</button>
             <button className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-xs font-bold text-[#9da0a7] hover:text-white transition-all">Blocked</button>
             <button className="ml-2 px-3 py-1.5 rounded-lg bg-[#23a559] text-xs font-bold text-white shadow-lg shadow-[#23a559]/20 hover:scale-105 active:scale-95 transition-all">Add Friend</button>
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8 space-y-10">
          
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
                    disabled={!friendEmail.includes('@')}
                    className="rounded-2xl bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] px-8 font-bold text-white shadow-lg shadow-[#ff3b5f]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:scale-100"
                  >
                    Send Request
                  </button>
                </div>

                {outgoingRequests.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 animate-in fade-in duration-500">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9da0a7] w-full mb-1 opacity-50">Pending Sent Requests</p>
                    {outgoingRequests.map((req) => (
                      <div key={req.id} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-white/5">
                        <span className="text-xs text-[#9da0a7]">{req.senderEmail}</span>
                        <X size={12} className="text-[#9da0a7] cursor-pointer hover:text-[#da373c] transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </section>

          {/* Incoming Requests */}
          {(incomingRequests.length > 0) && (
            <section className="space-y-4 animate-in slide-in-from-top-6 duration-700">
               <h4 className="px-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#9da0a7] opacity-60">
                 Friend Requests — {incomingRequests.length}
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="group flex flex-col rounded-3xl border border-white/5 bg-[#1e1f22]/50 p-5 transition-all hover:bg-[#1e1f22] hover:border-[#ff3b5f]/20 hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2e3035] to-[#1e1f22] flex items-center justify-center text-lg font-bold text-white/40 ring-1 ring-white/5">
                           {request.senderAvatarUrl ? <img src={request.senderAvatarUrl} className="w-full h-full rounded-2xl object-cover" /> : request.senderName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#ff3b5f] transition-colors">{request.senderName}</p>
                          <p className="text-xs text-[#9da0a7]">{request.senderHandle}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespondFriendRequest(request.id, "accept")}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#23a559] py-2.5 text-xs font-bold text-white shadow-lg shadow-[#23a559]/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check size={16} /> Accept
                        </button>
                        <button
                          onClick={() => handleRespondFriendRequest(request.id, "decline")}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-[#9da0a7] transition-all hover:bg-[#da373c]/10 hover:text-[#da373c]"
                        >
                          <X size={16} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* Friends List */}
          <section className="space-y-4 animate-in slide-in-from-top-8 duration-700">
             <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9da0a7] opacity-60">
                  All Friends — {friends.length}
                </h4>
             </div>
             
             {friends.length === 0 ? (
               <div className="rounded-3xl border border-dashed border-white/5 bg-white/[0.02] p-20 flex flex-col items-center justify-center text-center opacity-30 grayscale blur-[0.3px]">
                  <Users size={40} className="mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Your circle is waiting</p>
                  <p className="text-[10px] mt-2 max-w-[200px]">Add friends to start sharing voice, video, and messages.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="group flex items-center justify-between rounded-2xl border border-white/5 bg-black/10 p-4 transition-all hover:bg-white/[0.04] hover:shadow-lg cursor-pointer"
                      onClick={() => {
                        const thread = directThreads.find((item) => item.friendId === friend.id);
                        if (thread) handleOpenThread(thread.id);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#2e3035] to-[#1e1f22] text-sm font-bold text-white/40 ring-1 ring-white/5 shadow-inner">
                            {friend.avatarUrl ? (
                              <img src={friend.avatarUrl} alt={friend.name} className="h-full w-full rounded-2xl object-cover" />
                            ) : (
                              friend.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div
                            className={clsx(
                              "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-black transition-all",
                              onlineFriendIds.includes(friend.id) ? "bg-[#23a559]" : "bg-[#9da0a7] grayscale"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-white transition-colors">{friend.name}</p>
                          <p className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-tighter opacity-60">{friend.handle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-white/5 text-[#9da0a7] group-hover:text-[#ff3b5f] group-hover:bg-[#ff3b5f]/10 transition-all">
                           <MessageSquare size={18} />
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </section>

          {/* DM Quick List */}
          {directThreads.length > 0 && (
            <section className="space-y-4 animate-in fade-in duration-1000">
               <h4 className="px-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#9da0a7] opacity-60">
                 Recent Conversations
               </h4>
               <div className="space-y-2">
                  {directThreads.map((thread) => {
                    const unread = unreadCounts[thread.id] || 0;
                    return (
                      <button
                        key={thread.id}
                        onClick={() => handleOpenThread(thread.id)}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-2xl p-4 text-left transition-all border group",
                          activeThreadId === thread.id
                            ? "bg-[#ff3b5f]/5 border-[#ff3b5f]/30 shadow-lg"
                            : "bg-black/10 border-white/5 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 font-bold text-[#9da0a7] text-xs">
                              {thread.friendAvatarUrl ? <img src={thread.friendAvatarUrl} className="w-full h-full rounded-xl object-cover" /> : thread.friendName.charAt(0)}
                           </div>
                           <div className="min-w-0">
                              <p className={clsx("text-sm font-bold truncate transition-colors", activeThreadId === thread.id ? "text-white" : "text-[#f2f3f5] group-hover:text-white")}>{thread.friendName}</p>
                              <p className="text-xs text-[#9da0a7] truncate opacity-60 font-medium">{thread.lastMessage ?? "No messages yet"}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           {unread > 0 ? (
                             <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b5f] px-1.5 text-[10px] font-black text-white shadow-lg shadow-[#ff3b5f]/30 animate-in zoom-in">
                               {unread > 99 ? "99+" : unread}
                             </span>
                           ) : (
                             <div className="p-2 rounded-lg bg-white/5 text-[#9da0a7] opacity-0 group-hover:opacity-100 transition-all">
                                <Send size={14} />
                             </div>
                           )}
                        </div>
                      </button>
                    );
                  })}
               </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
