import { Bell, Paperclip, Search, SendHorizontal } from "lucide-react";

import type { Message } from "@/lib/types";

export function ChatPanel({
  channelName,
  items,
  composerValue,
  pending,
  onComposerChange,
  onSend
}: {
  channelName: string;
  items: Message[];
  composerValue: string;
  pending: boolean;
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-[32px] border border-white/10 bg-panel/90 shadow-panel backdrop-blur">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">#{channelName}</p>
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

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {items.map((message) => (
          <article key={message.id} className="flex gap-4 rounded-[26px] border border-white/8 bg-black/20 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
              {message.author.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-3">
                <span className="font-semibold">{message.author}</span>
                <span className="text-sm text-white/32">{message.handle}</span>
                <span className="text-sm text-white/32">{message.timestamp}</span>
              </div>
              <p className="max-w-3xl text-[15px] leading-7 text-white/74">{message.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t border-white/10 p-5">
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-steel px-4 py-3">
          <button className="rounded-2xl bg-black/20 p-2 text-white/65">
            <Paperclip size={16} />
          </button>
          <input
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35"
            placeholder={`Transmit to #${channelName}`}
            value={composerValue}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
          />
          <button
            onClick={onSend}
            disabled={pending}
            className="rounded-2xl bg-ember p-3 text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendHorizontal size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
