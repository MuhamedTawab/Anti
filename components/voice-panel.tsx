import clsx from "clsx";
import { Mic, MicOff, Radio, Users, Volume2 } from "lucide-react";

import type { Member } from "@/lib/types";

const statusStyles: Record<Member["status"], string> = {
  online: "bg-sea",
  idle: "bg-amber-300",
  focus: "bg-ember"
};

export function VoicePanel({
  members,
  roomName,
  joined,
  muted,
  connecting,
  participants,
  onToggleJoin,
  onToggleMute
}: {
  members: Member[];
  roomName: string;
  joined: boolean;
  muted: boolean;
  connecting: boolean;
  participants: number;
  onToggleJoin: () => void;
  onToggleMute: () => void;
}) {
  return (
    <aside className="flex w-[320px] flex-col rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">{roomName}</p>
          <p className="text-sm text-white/45">{participants} operators connected</p>
        </div>
        <div className="rounded-2xl border border-ember/20 bg-ember/10 p-3 text-ember">
          <Radio size={18} />
        </div>
      </div>

      <div className="mb-5 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-sea">
          <Volume2 size={16} />
          <span>Signal Feed</span>
        </div>
        <div className="flex items-end gap-2">
          {[16, 22, 12, 28, 18, 24, 14, 19].map((height, index) => (
            <span
              key={index}
              className="w-3 rounded-full bg-gradient-to-t from-ember via-violet-500 to-sea"
              style={{ height }}
            />
          ))}
        </div>
      </div>

      <div className="mb-5 flex gap-3">
        <button
          onClick={onToggleJoin}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold uppercase tracking-[0.1em] transition hover:brightness-105",
            joined ? "bg-sea text-ink" : "bg-ember text-white"
          )}
        >
          <Mic size={16} />
          {connecting ? "Connecting" : joined ? "Leave Voice" : "Join Voice"}
        </button>
        <button
          onClick={onToggleMute}
          disabled={!joined}
          title={!joined ? "Join a voice room first" : muted ? "Unmute microphone" : "Mute microphone"}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition",
            joined
              ? muted
                ? "border-ember/20 bg-ember/10 text-ember"
                : "border-white/10 bg-steel text-white/75 hover:bg-blade"
              : "border-white/10 bg-steel text-white/30"
          )}
        >
          <MicOff size={16} />
          {muted ? "Muted" : "Mute"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-white/50">
        <Users size={15} />
        <span>Members</span>
      </div>

      <div className="space-y-3">
        {members.length ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-steel px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 font-display text-sm">
                  {member.name.slice(0, 2).toUpperCase()}
                  <span
                    className={clsx(
                      "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-panel",
                      statusStyles[member.status]
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-white/45">{member.role}</p>
                </div>
              </div>
              <span className="text-xs uppercase tracking-[0.24em] text-white/35">
                {member.status}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-white/45">
            No one is in this room yet.
          </div>
        )}
      </div>
    </aside>
  );
}
