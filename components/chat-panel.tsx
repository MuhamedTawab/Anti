import { Bell, Paperclip, Search, SendHorizontal } from "lucide-react";

import type { Message } from "@/lib/types";

export function ChatPanel({
  channelName,
  channelPrefix,
  items,
  composerValue,
  pending,
  canSend,
  typingMembers,
  onComposerChange,
  onSend
}: {
  channelName: string;
  channelPrefix: "#" | "@";
  items: Message[];
  composerValue: string;
  pending: boolean;
  canSend: boolean;
  typingMembers: string[];
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="flex h-[72vh] min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-panel/90 shadow-panel backdrop-blur">
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
            className={`flex gap-4 rounded-[26px] border border-white/8 p-4 ${
              message.optimistic ? "bg-ember/10 opacity-80" : "bg-black/20"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
              {message.author.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-3">
                <span className="font-semibold">{message.author}</span>
                <span className="text-sm text-white/32">{message.handle}</span>
                <span className="text-sm text-white/32">{message.timestamp}</span>
                {message.optimistic ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-ember/90">sending</span>
                ) : null}
              </div>
              <p className="max-w-3xl text-[15px] leading-7 text-white/74">{message.body}</p>
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
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-steel px-4 py-3">
          <button className="rounded-2xl bg-black/20 p-2 text-white/65">
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
