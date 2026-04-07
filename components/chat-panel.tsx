import { useEffect, useRef } from "react";
import { Bell, Copy, Link2, Paperclip, Search, SendHorizontal, Trash2, X } from "lucide-react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length, channelName]);

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

      <div className="chat-scroll flex-1 min-h-0 space-y-5 overflow-y-auto px-6 py-6">
        {items.map((message) => (
          <article
            key={message.id}
            className={`group relative flex gap-4 rounded-[26px] border border-transparent p-4 transition-all hover:bg-black/30 hover:border-white/10 ${
              message.optimistic ? "bg-ember/10 opacity-80" : ""
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
            <div className="absolute right-6 top-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(message.body);
                }}
                className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-white/40 transition hover:border-sea/30 hover:text-sea"
                title="Copy text"
              >
                <Copy size={14} />
              </button>
              {message.canModerate ? (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-white/40 transition hover:border-ember/30 hover:text-ember"
                  title="Delete message"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingMembers.length ? (
        <div className="px-6 pb-3 text-sm text-sea">
          {typingMembers.join(", ")} {typingMembers.length === 1 ? "is" : "are"} typing...
        </div>
      ) : null}

      <div className="border-t border-white/10 p-5">
        {attachmentOpen ? (
          <div className="mb-3 flex items-center gap-2 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
            <Link2 size={16} className="text-sea" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Paste image or attachment URL"
              value={attachmentUrl}
              onChange={(event) => onAttachmentChange(event.target.value)}
            />
            <button
              onClick={onToggleAttachment}
              className="rounded-xl border border-white/10 bg-steel p-2 text-white/60 transition hover:bg-blade hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-steel px-4 py-3">
          <button onClick={onToggleAttachment} className="rounded-2xl bg-black/20 p-2 text-white/65">
            <Paperclip size={16} />
          </button>
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
