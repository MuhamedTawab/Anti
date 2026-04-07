"use client";

import clsx from "clsx";
import { Plus, Ticket, Users } from "lucide-react";

import { useNightlink } from "@/lib/context";

export function ServerRail() {
  const {
    data,
    activeServerId: activeId,
    handleServerSelect: onSelect,
    handleHomeSelect: onHomeSelect,
    setCreateServerModalOpen,
    setJoinInviteModalOpen,
    unreadCounts = {}
  } = useNightlink();

  const items = data.servers;

  return (
    <aside className="flex w-full flex-row items-center gap-3 overflow-x-auto bg-[#080809] px-3 py-4 xl:w-20 xl:flex-col xl:overflow-visible xl:px-3 xl:py-5 border-r border-white/5 relative z-20">
      {/* Home / Social Button */}
      <div className="relative group">
        <button
          onClick={onHomeSelect}
          className={clsx(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl font-bold transition-all duration-300 transform",
            activeId === null
              ? "bg-[#ff3b5f] text-white shadow-lg shadow-[#ff3b5f]/20 scale-100 rounded-xl"
              : "bg-[#1e1f22] text-[#9da0a7] hover:bg-[#ff3b5f] hover:text-white hover:rounded-xl scale-95 hover:scale-100"
          )}
        >
          <img src="/logo.jpg" alt="Home" className={clsx("h-7 w-7 object-contain transition-transform", activeId === null ? "scale-110" : "opacity-50 group-hover:opacity-100")} />
          {activeId === null && (
            <div className="absolute -left-3 h-8 w-1 rounded-r-full bg-white animate-in slide-in-from-left-2 duration-300" />
          )}
          <div className="absolute left-16 top-1/2 -translate-y-1/2 z-[100] scale-0 group-hover:scale-100 transition-all origin-left bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl pointer-events-none border border-white/10 uppercase tracking-widest">
             Social Hub
          </div>
        </button>
      </div>

      <div className="h-px w-8 bg-white/10 mx-auto opacity-40 xl:my-2" />
      {items.map((server) => {
        const isActive = server.id === activeId;
        const serverUnread = server.channels.reduce(
          (sum, ch) => sum + (unreadCounts[ch.id] ?? 0),
          0
        );

        return (
          <div key={server.id} className="relative group">
            <button
              onClick={() => onSelect(server.id)}
              className={clsx(
                "relative flex h-12 w-12 items-center justify-center rounded-2xl font-bold transition-all duration-300 transform",
                isActive
                  ? `bg-gradient-to-br ${server.accent} text-white shadow-lg shadow-[#ff3b5f]/20 scale-100 rounded-xl`
                  : "bg-[#1e1f22] text-[#9da0a7] hover:bg-[#ff3b5f] hover:text-white hover:rounded-xl scale-95 hover:scale-100"
              )}
            >
              <span className="text-xs uppercase tracking-tighter">{server.initials}</span>
              
              {isActive && (
                <div className="absolute -left-3 h-8 w-1 rounded-r-full bg-white animate-in slide-in-from-left-2 duration-300" />
              )}

              {!isActive && serverUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#da373c] text-[9px] font-black text-white border-2 border-[#080809] px-1">
                  {serverUnread > 99 ? "99+" : serverUnread}
                </span>
              )}

              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 z-[100] scale-0 group-hover:scale-100 transition-all origin-left bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl pointer-events-none border border-white/10 uppercase tracking-widest">
                 {server.name}
              </div>
            </button>
          </div>
        );
      })}

      <div className="xl:mt-auto flex flex-col gap-3">
        <div className="h-px w-8 bg-white/10 mx-auto opacity-40 xl:mb-2" />
        
        <button
          onClick={() => setCreateServerModalOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1e1f22] text-[#23a559] transition-all hover:bg-[#23a559] hover:text-white hover:rounded-xl group"
          title="Create Server"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        
        <button
          onClick={() => setJoinInviteModalOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1e1f22] text-[#ff3b5f] transition-all hover:bg-[#ff3b5f] hover:text-white hover:rounded-xl group"
          title="Join Server"
        >
          <Ticket size={18} className="group-hover:scale-110 transition-transform duration-300" />
        </button>
      </div>
    </aside>
  );
}
