import { useEffect, useRef, useState } from "react";
import { Bell, Copy, ImageIcon, Link2, LoaderCircle, Paperclip, Search, SendHorizontal, Trash2, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

import type { Message } from "@/lib/types";

export function ChatPanel({
  channelName,
  channelPrefix,
  items,
  composerValue,
  attachmentUrl,
  attachmentOpen,
  pending,
  canSend,
  typingMembers,
  onComposerChange,
  onAttachmentChange,
  onToggleAttachment,
  onSend,
  onDeleteMessage
}: {
  channelName: string;
  channelPrefix: "#" | "@";
  items: Message[];
  composerValue: string;
  attachmentUrl: string;
  attachmentOpen: boolean;
  pending: boolean;
  canSend: boolean;
  typingMembers: string[];
  onComposerChange: (value: string) => void;
  onAttachmentChange: (value: string) => void;
  onToggleAttachment: () => void;
  onSend: () => void;
  onDeleteMessage: (messageId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(items.length);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.error("No supabase client available for upload");
      setIsUploading(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage.from("attachments").upload(filePath, file);

    setIsUploading(false);
    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
      onAttachmentChange(publicUrlData.publicUrl);
    } else {
      console.error("Upload error:", error);
    }
  };

  // Only scroll when new messages are added AND user is already near the bottom
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (items.length <= prevLengthRef.current) {
      prevLengthRef.current = items.length;
      return;
    }
    prevLengthRef.current = items.length;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 200) {
      container.scrollTop = container.scrollHeight;
    }
  }, [items.length]);

  // Scroll to bottom when switching channels
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    prevLengthRef.current = items.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return (
    <section className="flex h-[75vh] min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-panel/90 shadow-panel backdrop-blur md:h-[85vh]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">
            {channelPrefix}
            {channelName}
          </p>
          <p className="text-sm text-white/42">Realtime drops, callouts, and squad planning.</p>
        </div>
        <div className="flex items-center gap-3 text-white/65">
          <button className="rounded-2xl border border-white/10 bg-steel p-3">
            <Search size={17} />
          </button>
          <button className="rounded-2xl border border-white/10 bg-steel p-3">
            <Bell size={17} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="chat-scroll flex-1 min-h-0 space-y-5 overflow-y-auto px-6 py-6">
        {items.map((message) => (
          <article
            key={message.id}
            className={`group relative flex gap-4 rounded-[26px] border border-transparent p-4 transition-colors hover:border-white/8 hover:bg-black/20 ${
              message.optimistic ? "opacity-70" : ""
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
              {message.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={message.authorAvatarUrl} alt={message.author} className="h-full w-full object-cover" />
              ) : (
                message.author.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-3">
                <span className="font-semibold">{message.author}</span>
                <span className="text-sm text-white/32">{message.handle}</span>
                <span className="text-sm text-white/32">{message.timestamp}</span>
                {message.optimistic ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-ember/90">sending</span>
                ) : null}
              </div>
              <p className="max-w-3xl text-[15px] leading-7 text-white/74">{message.body}</p>
              {message.attachments?.length ? (
                <div className="mt-3 space-y-3">
                  {message.attachments.map((attachment) =>
                    attachment.kind === "image" ? (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-h-72 rounded-2xl border border-white/10 object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-sea transition hover:brightness-110"
                      >
                        <Link2 size={14} />
                        {attachment.name}
                      </a>
                    )
                  )}
                </div>
              ) : null}
            </div>
            {/* Hover action buttons — appear on the right */}
            <div className="absolute right-4 top-3 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => navigator.clipboard.writeText(message.body)}
                className="rounded-xl border border-white/10 bg-panel/90 p-2 text-white/40 backdrop-blur transition hover:border-sea/40 hover:text-sea"
                title="Copy message"
              >
                <Copy size={13} />
              </button>
              {message.canModerate ? (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="rounded-xl border border-white/10 bg-panel/90 p-2 text-white/40 backdrop-blur transition hover:border-ember/40 hover:text-ember"
                  title="Delete message"
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {typingMembers.length ? (
        <div className="px-6 pb-3 text-sm text-sea">
          {typingMembers.join(", ")} {typingMembers.length === 1 ? "is" : "are"} typing...
        </div>
      ) : null}

      <div className="border-t border-white/10 p-5">
        {attachmentOpen || attachmentUrl ? (
          <div className="mb-3 flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
            <ImageIcon size={16} className="text-sea" />
            <div className="flex-1 truncate text-sm text-sea">
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin" /> Uploading image...
                </span>
              ) : attachmentUrl ? (
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-white transition">
                  Attached Image Ready
                </a>
              ) : (
                <span className="text-white/45">Ready to upload...</span>
              )}
            </div>
            {(attachmentUrl || !isUploading) && (
              <button
                onClick={() => {
                  onAttachmentChange("");
                  if (attachmentOpen) onToggleAttachment();
                }}
                className="rounded-xl border border-white/10 bg-steel p-2 text-white/60 transition hover:bg-blade hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-steel px-4 py-3">
          <label className="cursor-pointer rounded-2xl bg-black/20 p-2 text-white/65 hover:bg-black/40 hover:text-white transition">
            <Paperclip size={16} />
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={!canSend || isUploading}
            />
          </label>
          <input
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35"
            placeholder={canSend ? `Transmit to ${channelPrefix}${channelName}` : "Sign in to transmit"}
            value={composerValue}
            disabled={!canSend}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSend) {
                event.preventDefault();
                onSend();
              }
            }}
          />
          <button
            onClick={onSend}
            disabled={pending || !canSend}
            className="rounded-2xl bg-ember p-3 text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendHorizontal size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
