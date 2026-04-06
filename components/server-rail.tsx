import clsx from "clsx";
import { Plus, Ticket } from "lucide-react";

import type { Server } from "@/lib/types";

export function ServerRail({
  items,
  activeId,
  onSelect,
  onCreate,
  onJoin,
  unreadCounts
}: {
  items: Server[];
  activeId: string;
  unreadCounts?: Record<string, number>;
  onSelect: (serverId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <aside className="flex w-full flex-row items-center gap-3 overflow-x-auto rounded-[28px] border border-white/10 bg-panel/95 px-3 py-4 shadow-panel backdrop-blur xl:w-20 xl:flex-col xl:overflow-visible xl:px-3 xl:py-5">
      {items.map((server) => {
        const isActive = server.id === activeId;
        const serverUnread = server.channels.reduce((sum, channel) => {
          return sum + (unreadCounts?.[channel.id] || 0);
        }, 0);

        return (
          <button
            key={server.id}
            onClick={() => onSelect(server.id)}
            className={clsx(
              "relative flex h-14 w-14 items-center justify-center rounded-2xl border text-sm font-bold transition",
              isActive
                ? `border-ember/40 bg-gradient-to-br ${server.accent} text-ink`
                : "border-white/10 bg-steel text-white/80 hover:border-white/20 hover:bg-blade"
            )}
          >
            {isActive ? (
              <span className="absolute -left-[18px] h-7 w-1 rounded-full bg-ember" />
            ) : null}
            {server.initials}
            {serverUnread > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-white shadow-sm">
                {serverUnread > 99 ? "99+" : serverUnread}
              </span>
            ) : null}
          </button>
        );
      })}

      <button
        onClick={onCreate}
        className="xl:mt-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-steel text-white/60 transition hover:border-ember/30 hover:bg-blade hover:text-white"
      >
        <Plus size={18} />
      </button>
      <button
        onClick={onJoin}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-steel text-white/60 transition hover:border-sea/30 hover:bg-blade hover:text-sea"
      >
        <Ticket size={18} />
      </button>
    </aside>
  );
}
