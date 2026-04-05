"use client";

import { Check, MailPlus, MessageSquare, Send, UserPlus, X } from "lucide-react";

import type { DirectThread, Friend, FriendRequest } from "@/lib/types";

export function SocialPanel({
  friends,
  incomingRequests,
  outgoingRequests,
  directThreads,
  friendEmail,
  activeThreadId,
  onlineFriendIds,
  onFriendEmailChange,
  onSendRequest,
  onRespondRequest,
  onOpenThread
}: {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  directThreads: DirectThread[];
  friendEmail: string;
  activeThreadId: string | null;
  onlineFriendIds: string[];
  onFriendEmailChange: (value: string) => void;
  onSendRequest: () => void;
  onRespondRequest: (requestId: string, action: "accept" | "decline") => void;
  onOpenThread: (threadId: string) => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-sea">
          <MailPlus size={15} />
          <span>Add Friend</span>
        </div>
        <div className="flex gap-2">
          <input
            value={friendEmail}
            onChange={(event) => onFriendEmailChange(event.target.value)}
            placeholder="Friend email"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-steel px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
          />
          <button
            onClick={onSendRequest}
            className="rounded-2xl bg-ember px-3 py-2.5 text-white transition hover:brightness-105"
          >
            <UserPlus size={16} />
          </button>
        </div>
        {outgoingRequests.length ? (
          <p className="mt-3 text-xs text-white/45">
            Pending: {outgoingRequests.map((request) => request.senderEmail).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="px-2 text-xs uppercase tracking-[0.28em] text-white/35">Requests</p>
        {incomingRequests.length ? (
          incomingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3"
            >
              <p className="text-sm font-medium text-white">{request.senderName}</p>
              <p className="text-xs text-white/40">{request.senderHandle}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onRespondRequest(request.id, "accept")}
                  className="rounded-xl bg-sea px-3 py-2 text-ink transition hover:brightness-105"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => onRespondRequest(request.id, "decline")}
                  className="rounded-xl border border-white/10 bg-steel px-3 py-2 text-white transition hover:bg-blade"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/45">
            No incoming requests.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="px-2 text-xs uppercase tracking-[0.28em] text-white/35">Friends</p>
        {friends.length ? (
          friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-xs font-semibold text-white">
                  {friend.name.slice(0, 2).toUpperCase()}
                  <span
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-panel ${
                      onlineFriendIds.includes(friend.id) ? "bg-sea" : "bg-white/20"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{friend.name}</p>
                  <p className="text-xs text-white/40">{friend.handle}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const thread = directThreads.find((item) => item.friendId === friend.id);
                  if (thread) {
                    onOpenThread(thread.id);
                  }
                }}
                className="rounded-xl border border-white/10 bg-steel px-3 py-2 text-white transition hover:bg-blade"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/45">
            No friends added yet.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="px-2 text-xs uppercase tracking-[0.28em] text-white/35">Direct Messages</p>
        {directThreads.length ? (
          directThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onOpenThread(thread.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                activeThreadId === thread.id
                  ? "border border-ember/25 bg-gradient-to-r from-ember/16 to-transparent text-white"
                  : "border border-white/10 bg-black/15 text-white/75 hover:bg-black/20 hover:text-white"
              }`}
            >
              <div>
                <p className="text-sm font-medium">{thread.friendName}</p>
                <p className="mt-1 text-xs text-white/40">{thread.lastMessage ?? "No messages yet"}</p>
              </div>
              <Send size={14} />
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/45">
            No private chats yet.
          </div>
        )}
      </div>
    </div>
  );
}
