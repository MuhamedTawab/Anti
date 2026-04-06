import clsx from "clsx";
import { Ban, Hash, Headphones, Shield, Sparkles, Ticket, UserX, Users } from "lucide-react";

import type { Channel, Member, Server } from "@/lib/types";

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
  onlineMembers,
  currentUserId,
  inviteCode,
  canManageServer,
  onTextSelect,
  onVoiceSelect,
  onCreateInvite,
  onModerateMember
}: {
  server: Server;
  activeChannelId: string;
  activeVoiceChannelId: string;
  onlineMembers: Member[];
  currentUserId: string;
  inviteCode: string | null;
  canManageServer: boolean;
  onTextSelect: (channelId: string) => void;
  onVoiceSelect: (channelId: string) => void;
  onCreateInvite: () => void;
  onModerateMember: (targetProfileId: string, action: "kick" | "ban") => void;
}) {
  const textChannels = server.channels.filter((channel) => channel.kind === "text");
  const voiceChannels = server.channels.filter((channel) => channel.kind === "voice");

  return (
    <section className="flex w-full flex-col rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel backdrop-blur xl:w-[300px]">
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
          Server is stable. Matchmaking chat is hot, voice load is clean, and your current squad tools are ready.
        </p>
        {canManageServer ? (
          <div className="mt-4 space-y-3">
            <button
              onClick={onCreateInvite}
              className="inline-flex items-center gap-2 rounded-2xl border border-sea/20 bg-sea/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-sea transition hover:brightness-110"
            >
              <Ticket size={13} />
              Create Invite
            </button>
            {inviteCode ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                Invite Code: <span className="font-semibold tracking-[0.22em] text-white">{inviteCode}</span>
              </div>
            ) : null}
          </div>
        ) : null}
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

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 px-2 text-xs uppercase tracking-[0.28em] text-white/35">
          <Users size={13} />
          <span>Online</span>
        </div>
        <div className="space-y-2">
          {onlineMembers.length ? (
            onlineMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-xs font-semibold text-white">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatarUrl} alt={member.name} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      member.name.slice(0, 2).toUpperCase()
                    )}
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-panel bg-sea" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <p className="text-xs text-white/40">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageServer && member.id !== currentUserId ? (
                    <>
                      <button
                        onClick={() => onModerateMember(member.id, "kick")}
                        className="rounded-xl border border-white/10 bg-steel p-2 text-white/65 transition hover:bg-blade hover:text-white"
                        title="Kick member"
                      >
                        <UserX size={12} />
                      </button>
                      <button
                        onClick={() => onModerateMember(member.id, "ban")}
                        className="rounded-xl border border-ember/20 bg-ember/10 p-2 text-ember transition hover:brightness-110"
                        title="Ban member"
                      >
                        <Ban size={12} />
                      </button>
                    </>
                  ) : null}
                  <span className="text-[10px] uppercase tracking-[0.22em] text-sea">online</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/45">
              No members online yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
