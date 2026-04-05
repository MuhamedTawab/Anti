import clsx from "clsx";
import { Plus } from "lucide-react";

import type { Server } from "@/lib/types";

export function ServerRail({
  items,
  activeId,
  onSelect
}: {
  items: Server[];
  activeId: string;
  onSelect: (serverId: string) => void;
}) {
  return (
    <aside className="flex w-20 flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-panel/95 px-3 py-5 shadow-panel backdrop-blur">
      {items.map((server) => {
        const isActive = server.id === activeId;

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
          </button>
        );
      })}

      <button className="mt-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-steel text-white/60 transition hover:border-ember/30 hover:bg-blade hover:text-white">
        <Plus size={18} />
      </button>
    </aside>
  );
}
