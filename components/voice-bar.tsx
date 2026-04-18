"use client";

import { Mic, MicOff, Headphones, PhoneOff, Radio } from "lucide-react";
import clsx from "clsx";
import { useBlaze } from "@/lib/context";

export function VoiceBar() {
  const {
    joinedVoiceRoomId,
    voiceConnectionStatus,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    handleVoiceToggle,
    activeServer,
    data
  } = useBlaze();

  if (!joinedVoiceRoomId) return null;

  // Find the joined room name from global data
  let joinedRoomName = "Active Call";
  data.servers.forEach(s => {
    const channel = s.channels.find(c => c.id === joinedVoiceRoomId);
    if (channel) joinedRoomName = channel.name;
  });

  return (
    <div className="mx-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-[#1e1f22]/90 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          {/* Status & Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div 
                className={clsx(
                  "h-2.5 w-2.5 rounded-full",
                  voiceConnectionStatus === "connected" ? "bg-[#23a559]" : "bg-amber-400"
                )} 
              />
              {voiceConnectionStatus === "connected" && (
                <div className="absolute inset-0 rounded-full bg-[#23a559] animate-ping opacity-40" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-white truncate leading-none mb-1">
                {joinedRoomName}
              </span>
              <span className="text-[9px] font-bold text-[#23a559] uppercase tracking-tighter opacity-80">
                {voiceConnectionStatus === 'connected' ? 'Voice Connected' : 'Securing Signal...'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                isMuted ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                isDeafened ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
              )}
              title={isDeafened ? "Undeafen" : "Deafen"}
            >
              <Headphones size={14} className={clsx(isDeafened && "animate-pulse")} />
            </button>
            <button
              onClick={() => handleVoiceToggle(joinedVoiceRoomId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#da373c]/10 text-[#da373c] hover:bg-[#da373c] hover:text-white transition-all group"
              title="Disconnect"
            >
              <PhoneOff size={14} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
