"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Bell, 
  Copy, 
  ImageIcon, 
  Link2, 
  LoaderCircle, 
  Paperclip, 
  Search, 
  SendHorizontal, 
  Trash2, 
  X,
  MoreVertical,
  ShieldAlert,
  UserMinus,
  Smile
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import clsx from "clsx";

import { useBlaze } from "@/lib/context";
import type { Message } from "@/lib/types";

export function ChatPanel({
  title,
  isOwner,
  onModerateMember
}: {
  title: string;
  isOwner?: boolean;
  onModerateMember?: (targetId: string, action: "kick" | "ban") => Promise<void>;
}) {
  const {
    displayedMessages: items,
    composerValue,
    handleComposerChange: onComposerChange,
    handleSendMessage: onSend,
    handleDeleteMessage: onDeleteMessage,
    handleLoadMore: onLoadMore,
    hasMore,
    isLoadingMore,
    isSending: pending,
    error,
    setError,
    attachmentUrl,
    setAttachmentUrl: onAttachmentChange,
    attachmentOpen,
    setAttachmentOpen: onToggleAttachment,
    activeTypingMembers: typingMembers,
    sendReaction
  } = useBlaze();

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(items.length);
  const prevScrollHeightRef = useRef(0);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploadError(null);
    setIsUploading(true);
    if (!attachmentOpen) onToggleAttachment(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUploadError("Storage not available.");
      setIsUploading(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error: uploadErr } = await supabase.storage.from("attachments").upload(filePath, file);

    setIsUploading(false);
    if (!uploadErr && data) {
      const { data: publicUrlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
      onAttachmentChange(publicUrlData.publicUrl);
    } else {
      console.error("Upload error:", uploadErr);
      setUploadError(uploadErr?.message ?? "Upload failed. Check storage bucket permissions.");
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (items.length > prevLengthRef.current) {
      const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
      if (heightDiff > 0 && container.scrollTop < 100) {
        container.scrollTop = heightDiff;
      }
    }
    prevLengthRef.current = items.length;
    prevScrollHeightRef.current = container.scrollHeight;
  }, [items.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (container.scrollTop > container.scrollHeight - container.clientHeight - 200) {
      container.scrollTop = container.scrollHeight;
    }
  }, [items.length]);

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    const sentinel = topSentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore, items]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-[#111214]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-[#9da0a7]">#</span>
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-4 text-[#9da0a7]">
          <Bell size={20} className="cursor-pointer hover:text-white transition-colors" />
          <div className="relative">
            <Search size={20} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Search"
              className="h-8 w-36 rounded-lg bg-black/40 pl-9 pr-3 text-xs transition-all focus:w-64 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#ff3b5f]/50"
            />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar scroll-smooth"
      >
        <div ref={topSentinelRef} className="h-4 w-full flex items-center justify-center opacity-0">
          {isLoadingMore && <LoaderCircle className="animate-spin text-[#ff3b5f]" size={20} />}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#9da0a7]">
             <div className="p-8 rounded-full bg-white/5 mb-4">
                <SendHorizontal size={48} className="opacity-20 translate-x-1" />
             </div>
             <p className="font-medium text-lg text-white/50">Start of a new conversation</p>
             <p className="text-sm opacity-60">Send a message to get things started.</p>
          </div>
        ) : (
          items.map((message, i) => {
            const isOptimistic = message.optimistic;
            const isConsecutive = i > 0 && items[i - 1].author === message.author;

            return (
              <div
                key={message.id}
                className={clsx(
                  "group relative -mx-4 px-4 py-0.5 transition-colors hover:bg-white/[0.02]",
                  isOptimistic && "opacity-60"
                )}
              >
                {!isConsecutive ? (
                  <div className="mt-4 flex gap-4">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#2e3035] to-[#1e1f22]">
                       {message.authorAvatarUrl ? (
                         <img src={message.authorAvatarUrl} alt={message.author} className="h-full w-full object-cover" />
                       ) : (
                         <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/40">
                           {message.author.charAt(0)}
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#f2f3f5] hover:underline cursor-pointer">{message.author}</span>
                        <span className="text-[10px] font-medium text-[#9da0a7]">
                          {message.timestamp}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#dbdee1] break-words">
                        {message.body}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex pl-14">
                    <p className="text-sm leading-relaxed text-[#dbdee1] break-words flex-1">
                      {message.body}
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {(message.attachments ?? []).length > 0 && (
                  <div className={clsx("mt-2 flex flex-wrap gap-2", !isConsecutive ? "pl-14" : "pl-14")}>
                    {message.attachments?.map((attachment) => (
                      <div key={attachment.id} className="group/att relative overflow-hidden rounded-xl border border-white/5 bg-black/20 transition-all hover:border-white/10 hover:shadow-xl">
                        {attachment.kind === "image" ? (
                          <div className="max-w-sm sm:max-w-md">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="block h-auto max-h-[300px] w-auto rounded-lg transition-transform duration-300 group-hover/att:scale-[1.01]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover/att:opacity-100 flex items-end p-3">
                               <a href={attachment.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-white uppercase tracking-widest hover:underline backdrop-blur-sm bg-white/10 px-2 py-1 rounded">View Fullsize</a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3 transition-colors hover:bg-white/5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff3b5f]/10 text-[#ff3b5f]">
                              <Link2 size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">{attachment.name}</span>
                              <a href={attachment.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#9da0a7] hover:underline">
                                {new URL(attachment.url).hostname}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute right-4 top-2 hidden group-hover:flex items-center gap-1 rounded-lg border border-white/5 bg-[#1e1f22] p-1 shadow-xl z-10">
                   {isOwner && (
                     <>
                      <button 
                        onClick={() => onModerateMember?.(message.authorId!, 'kick')}
                        className="p-1.5 text-[#9da0a7] hover:text-[#ff3b5f] transition-colors rounded hover:bg-white/5" 
                        title="Kick Member"
                      >
                        <UserMinus size={14} />
                      </button>
                      <button 
                        onClick={() => onModerateMember?.(message.authorId!, 'ban')}
                        className="p-1.5 text-[#9da0a7] hover:text-[#ff3b5f] transition-colors rounded hover:bg-white/5" 
                        title="Ban Member"
                      >
                        <ShieldAlert size={14} />
                      </button>
                     </>
                   )}
                  <button className="p-1.5 text-[#9da0a7] hover:text-white transition-colors rounded hover:bg-white/5" title="Copy Message">
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteMessage(message.id)}
                    className="p-1.5 text-[#9da0a7] hover:text-[#da373c] transition-colors rounded hover:bg-white/5" 
                    title="Delete Message"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button className="p-1.5 text-[#9da0a7] hover:text-white transition-colors rounded hover:bg-white/5">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer Area */}
      <div className="p-4 bg-[#111214]">
        {attachmentOpen && (
          <div className="mb-3 rounded-2xl bg-black/40 p-4 border border-white/5 animate-in slide-in-from-bottom-2 duration-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9da0a7]">Attach File</span>
              <button 
                onClick={() => onToggleAttachment(false)}
                className="rounded-full bg-white/5 p-1 text-[#9da0a7] hover:bg-white/10 hover:text-white transition-colors"
                title="Cancel upload"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
               {attachmentUrl ? (
                 <div className="relative group max-w-[120px]">
                   <img src={attachmentUrl} alt="Preview" className="h-16 w-full rounded-lg object-cover ring-2 ring-[#ff3b5f]/30" />
                   <button 
                     onClick={() => onAttachmentChange("")}
                     className="absolute -right-2 -top-2 rounded-full bg-[#da373c] p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                     <X size={12} />
                   </button>
                 </div>
               ) : (
                <div className="flex flex-1 items-center gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/10 text-[#9da0a7] transition-all hover:border-[#ff3b5f]/50 hover:bg-[#ff3b5f]/5 hover:text-white group disabled:opacity-50"
                  >
                    {isUploading ? <LoaderCircle className="animate-spin" size={20} /> : <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />}
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Upload</span>
                  </button>
                  <div className="flex-1 opacity-40">
                    <p className="text-[11px] font-medium">Click box to upload or paste a link below</p>
                    <p className="text-[9px] mt-0.5">Images, PDFs, and more (Max 5MB)</p>
                  </div>
                </div>
               )}
               <input 
                 type="file" 
                 className="hidden" 
                 ref={fileInputRef} 
                 onChange={handleFileUpload} 
                 accept="image/*"
               />

               <div className="flex-1">
                 <div className="relative">
                   <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9da0a7]" />
                   <input
                     type="text"
                     value={attachmentUrl}
                     onChange={(e) => onAttachmentChange(e.target.value)}
                     placeholder="Paste an external image or link URL..."
                     className="h-11 w-full rounded-xl bg-black/40 pl-10 pr-4 text-xs font-medium text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30"
                   />
                 </div>
                 {uploadError && <p className="mt-2 text-[10px] font-bold text-[#da373c] animate-in fade-in">{uploadError}</p>}
               </div>
            </div>
          </div>
        )}

        {typingMembers.length > 0 && (
           <div className="px-2 mb-1.5 h-4 flex items-center gap-1.5 animate-in fade-in duration-300">
              <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-[#ff3b5f] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-[#ff3b5f] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-[#ff3b5f] rounded-full animate-bounce" />
              </div>
              <p className="text-[10px] font-bold text-[#9da0a7] tracking-tight">
                <span className="text-white/80">{typingMembers.join(", ")}</span> {typingMembers.length === 1 ? 'is' : 'are'} typing...
              </p>
           </div>
        )}

        <div className="group relative flex flex-col rounded-2xl bg-[#1e1f22] p-1 shadow-2xl transition-all focus-within:ring-2 focus-within:ring-[#ff3b5f]/30">
          <div className="flex items-center gap-2 px-1">
            <button 
              onClick={() => onToggleAttachment(true)}
              className={clsx(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95",
                attachmentOpen ? "bg-[#ff3b5f] text-white" : "bg-white/5 text-[#9da0a7] hover:bg-white/10 hover:text-white"
              )}
            >
              <Paperclip size={18} />
            </button>
            <button 
              onClick={() => sendReaction("🔥")}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#9da0a7] transition-all hover:scale-110 hover:bg-white/10 hover:text-[#ff8a5b] active:scale-90"
              title="Send Reaction"
            >
              <Smile size={18} />
            </button>
            <input
              type="text"
              value={composerValue}
              onChange={(e) => onComposerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={`Message #${title}`}
              className="flex-1 bg-transparent py-3.5 text-sm font-medium text-[#dbdee1] placeholder-[#6d6f78] focus:outline-none"
            />
            <button 
              onClick={onSend}
              disabled={pending || (!composerValue.trim() && !attachmentUrl.trim())}
              className={clsx(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95",
                composerValue.trim() || attachmentUrl.trim()
                  ? "bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] text-white shadow-lg shadow-[#ff3b5f]/20"
                  : "bg-white/5 text-[#4e5058] cursor-not-allowed"
              )}
            >
              {pending ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#da373c]/10 px-4 py-2 border border-[#da373c]/20 animate-in slide-in-from-top-2">
            <p className="text-xs font-bold text-[#da373c]">{error}</p>
            <button onClick={() => setError(null)} className="text-[#da373c] hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
