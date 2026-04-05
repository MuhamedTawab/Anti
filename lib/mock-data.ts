import { getBootstrap } from "@/lib/store";

const bootstrap = getBootstrap();

export const servers = bootstrap.servers;
export const activeServer = servers[0];
export const activeChannel =
  activeServer.channels.find((channel) => channel.kind === "text") ?? activeServer.channels[0];
export const messages = bootstrap.messages[activeChannel.id] ?? [];
export const members =
  bootstrap.members[
    activeServer.channels.find((channel) => channel.kind === "voice")?.id ?? "war-room"
  ] ?? [];
