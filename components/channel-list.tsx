import clsx from "clsx";
import { Hash, Headphones, Shield, Sparkles } from "lucide-react";

import type { Channel, Server } from "@/lib/types";

function ChannelRow({
  channel,
  active,
  onClick
}: {
  channel: Channel;
  active: boolean;
  onClick: (channelId: string) => void;
}) {
  const Icon = channel.kind === "voice" ? Headphones : Hash;

  return (
    <button
      onClick={() => onClick(channel.id)}
      className={clsx(
        "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition",
        active
          ? "border border-ember/25 bg-gradient-to-r from-ember/16 to-transparent text-white"
          : "border border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={16} />
        <span>{channel.name}</span>
      </span>
      {channel.kind === "text" && channel.unread ? (
        <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">
          {channel.unread}
        </span>
      ) : null}
      {channel.kind === "voice" && channel.members ? (
        <span className="text-xs uppercase tracking-[0.2em] text-sea/90">{channel.members} live</span>
      ) : null}
    </button>
  );
}

export function ChannelList({
  server,
  activeChannelId,
  activeVoiceChannelId,
  onTextSelect,
  onVoiceSelect
}: {
  server: Server;
  activeChannelId: string;
  activeVoiceChannelId: string;
  onTextSelect: (channelId: string) => void;
  onVoiceSelect: (channelId: string) => void;
}) {
  const textChannels = server.channels.filter((channel) => channel.kind === "text");
  const voiceChannels = server.channels.filter((channel) => channel.kind === "voice");

  return (
    <section className="flex w-[300px] flex-col rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">{server.name}</p>
          <p className="text-sm text-white/45">Low-noise comms for late-night sessions.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-steel p-3 text-sea">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-ember">
          <Shield size={15} />
          <span>Combat Status</span>
        </div>
        <p className="text-sm leading-6 text-white/62">
          Server is stable. Matchmaking chat is hot, voice load is clean, and two fresh invites are waiting.
        </p>
      </div>

      <div className="space-y-2">
        <p className="px-2 text-xs uppercase tracking-[0.28em] text-white/35">Text</p>
        {textChannels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={channel.id === activeChannelId}
            onClick={onTextSelect}
          />
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <p className="px-2 text-xs uppercase tracking-[0.28em] text-white/35">Voice</p>
        {voiceChannels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={channel.id === activeVoiceChannelId}
            onClick={onVoiceSelect}
          />
        ))}
      </div>
    </section>
  );
}
