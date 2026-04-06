import clsx from "clsx";
import { Hand, Headphones, Mic, MicOff, Radio, Users, Volume2 } from "lucide-react";

import type { Member } from "@/lib/types";

export function VoicePanel({
  members,
  roomName,
  joined,
  muted,
  deafened,
  connecting,
  pushToTalk,
  transmitting,
  signalLevels,
  outputVolume,
  connectionStatus,
  speakingUserIds,
  participants,
  onToggleJoin,
  onToggleMute,
  onToggleDeafen,
  onTogglePushToTalk,
  onOutputVolumeChange
}: {
  members: Member[];
  roomName: string;
  joined: boolean;
  muted: boolean;
  deafened: boolean;
  connecting: boolean;
  pushToTalk: boolean;
  transmitting: boolean;
  signalLevels: number[];
  outputVolume: number;
  connectionStatus: "idle" | "connecting" | "connected" | "reconnecting" | "failed";
  speakingUserIds: string[];
  participants: number;
  onToggleJoin: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onTogglePushToTalk: () => void;
  onOutputVolumeChange: (value: number) => void;
}) {
  const statusLabel =
    connectionStatus === "failed"
      ? "Voice failed"
      : connectionStatus === "reconnecting"
        ? "Reconnecting"
        : connectionStatus === "connecting"
          ? "Connecting"
          : connectionStatus === "connected"
            ? "Connected"
            : "Idle";

  return (
    <aside className="flex w-[320px] flex-col rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">{roomName}</p>
          <p className="text-sm text-white/45">
            {participants} operators connected
            <span
              className={clsx(
                "ml-3 inline-block rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]",
                connectionStatus === "connected"
                  ? "bg-sea/12 text-sea"
                  : connectionStatus === "failed"
                    ? "bg-ember/12 text-ember"
                    : "bg-white/8 text-white/55"
              )}
            >
              {statusLabel}
            </span>
          </p>
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
          {signalLevels.map((height, index) => (
            <span
              key={index}
              className="w-3 rounded-full bg-gradient-to-t from-ember via-violet-500 to-sea transition-[height] duration-100 ease-out"
              style={{ height: `${height}px` }}
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

      <div className="mb-5 flex gap-3">
        <button
          onClick={onToggleDeafen}
          disabled={!joined}
          title={!joined ? "Join a voice room first" : deafened ? "Undeafen room audio" : "Deafen room audio"}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition",
            joined
              ? deafened
                ? "border-ember/20 bg-ember/10 text-ember"
                : "border-white/10 bg-steel text-white/75 hover:bg-blade"
              : "border-white/10 bg-steel text-white/30"
          )}
        >
          <Headphones size={16} />
          {deafened ? "Deafened" : "Deafen"}
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-black/15 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
              Push To Talk
            </p>
            <p className="mt-1 text-xs text-white/45">
              Hold `Space` to talk when this is enabled.
            </p>
          </div>
          <button
            onClick={onTogglePushToTalk}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition",
              pushToTalk
                ? "border-sea/20 bg-sea/10 text-sea"
                : "border-white/10 bg-steel text-white/70 hover:bg-blade"
            )}
          >
            <Hand size={14} />
            {pushToTalk ? "On" : "Off"}
          </button>
        </div>
        {pushToTalk ? (
          <div
            className={clsx(
              "mt-3 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.12em]",
              transmitting ? "bg-sea/10 text-sea" : "bg-white/5 text-white/45"
            )}
          >
            {transmitting ? "Transmitting" : "Standby"}
          </div>
        ) : null}
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-black/15 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
              Room Volume
            </p>
            <p className="mt-1 text-xs text-white/45">
              Controls only what you hear in this room.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.12em] text-sea">
            {Math.round(outputVolume * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(outputVolume * 100)}
          onChange={(event) => onOutputVolumeChange(Number(event.target.value) / 100)}
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#7bf6ff]"
        />
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
                <div
                  className={clsx(
                    "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 font-display text-sm transition",
                    speakingUserIds.includes(member.id) &&
                      "ring-2 ring-sea/80 shadow-[0_0_22px_rgba(123,246,255,0.35)]"
                  )}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                  <span
                    className={clsx(
                      "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-panel",
                      speakingUserIds.includes(member.id)
                        ? "bg-sea"
                        : member.status === "online"
                          ? "bg-sea"
                          : member.status === "idle"
                            ? "bg-amber-300"
                            : "bg-ember"
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-white/45">
                    {speakingUserIds.includes(member.id) ? "Speaking now" : member.role}
                  </p>
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
