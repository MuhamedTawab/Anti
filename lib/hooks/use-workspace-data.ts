"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthIdentity, BootstrapPayload, SocialPayload } from "@/lib/types";

function getInitialServer(data: BootstrapPayload) {
  return (
    data.servers[0] ?? {
      id: "empty",
      name: "Nightlink",
      initials: "NL",
      accent: "from-[#ff3b5f] to-[#ff8a5b]",
      channels: []
    }
  );
}

function getInitialTextChannel(server: ReturnType<typeof getInitialServer>) {
  return (
    server.channels.find((channel) => channel.kind === "text") ??
    server.channels[0] ?? {
      id: "empty-text",
      name: "general",
      kind: "text"
    }
  );
}

function profileSnapshotKey(profile: AuthIdentity | null) {
  if (!profile) {
    return null;
  }

  return JSON.stringify({
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl ?? "",
    bio: profile.bio ?? ""
  });
}

export interface WorkspaceDataResult {
  data: BootstrapPayload;
  setData: React.Dispatch<React.SetStateAction<BootstrapPayload>>;
  activeServerId: string;
  setActiveServerId: React.Dispatch<React.SetStateAction<string>>;
  activeTextChannelId: string;
  setActiveTextChannelId: React.Dispatch<React.SetStateAction<string>>;
  activeVoiceChannelId: string;
  setActiveVoiceChannelId: React.Dispatch<React.SetStateAction<string>>;
  socialData: SocialPayload;
  setSocialData: React.Dispatch<React.SetStateAction<SocialPayload>>;
  activeThreadId: string | null;
  setActiveThreadId: React.Dispatch<React.SetStateAction<string | null>>;
  profileName: string;
  profileHandle: string;
  profileAvatarUrl: string;
  profileBio: string;
  setProfileName: React.Dispatch<React.SetStateAction<string>>;
  setProfileHandle: React.Dispatch<React.SetStateAction<string>>;
  setProfileAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  setProfileBio: React.Dispatch<React.SetStateAction<string>>;
  profileDraftDirtyRef: React.MutableRefObject<boolean>;
  lastProfileSyncRef: React.MutableRefObject<string | null>;
}

export function useWorkspaceData(
  initialData: BootstrapPayload,
  currentUser: AuthIdentity | null,
  accessToken: string | null,
  getAuthHeaders: () => { Authorization: string } | null,
  setCurrentUser: React.Dispatch<React.SetStateAction<AuthIdentity | null>>
): WorkspaceDataResult {
  const [data, setData] = useState(initialData);
  const [activeServerId, setActiveServerId] = useState(getInitialServer(initialData).id);
  const [activeTextChannelId, setActiveTextChannelId] = useState(
    getInitialTextChannel(getInitialServer(initialData)).id
  );
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState(
    getInitialServer(initialData).channels.find((channel) => channel.kind === "voice")?.id ?? ""
  );
  const [socialData, setSocialData] = useState<SocialPayload>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    directThreads: []
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const profileDraftDirtyRef = useRef(false);
  const lastProfileSyncRef = useRef<string | null>(null);

  // Initial anonymous bootstrap load
  useEffect(() => {
    let cancelled = false;

    fetch("/api/bootstrap", { cache: "no-store" })
      .then((resp) => resp.json() as Promise<BootstrapPayload>)
      .then((nextData) => {
        if (!cancelled) {
          setData(nextData);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  // Authenticated workspace sync
  useEffect(() => {
    if (!currentUser || !accessToken) {
      return;
    }

    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    async function syncAndLoadWorkspace() {
      if (!headers) return;

      const profileResponse = await fetch("/api/me/profile", {
        method: "POST",
        headers
      });

      const profilePayload = (await profileResponse.json().catch(() => null)) as
        | { profile?: AuthIdentity }
        | null;

      // Profile is returned by the API with the resolved DB row
      // We forward this to the parent so currentUser is always in sync
      if (profilePayload?.profile) {
        if (!profileDraftDirtyRef.current) {
          setProfileName(profilePayload.profile.name);
          setProfileHandle(profilePayload.profile.handle);
          setProfileAvatarUrl(profilePayload.profile.avatarUrl ?? "");
          setProfileBio(profilePayload.profile.bio ?? "");
          lastProfileSyncRef.current = profileSnapshotKey(profilePayload.profile);
        }
        setCurrentUser(profilePayload.profile);
      }

      const [bootstrapResponse, socialResponse] = await Promise.all([
        fetch("/api/bootstrap", { headers, cache: "no-store" }),
        fetch("/api/social", { headers, cache: "no-store" })
      ]);

      if (bootstrapResponse.ok) {
        const nextData = (await bootstrapResponse.json()) as BootstrapPayload;
        setData(nextData);
        if (!nextData.servers.some((server) => server.id === activeServerId) && nextData.servers[0]) {
          setActiveServerId(nextData.servers[0].id);
          setActiveTextChannelId(getInitialTextChannel(nextData.servers[0]).id);
          setActiveVoiceChannelId(
            nextData.servers[0].channels.find((channel) => channel.kind === "voice")?.id ?? ""
          );
        }
      }

      if (socialResponse.ok) {
        const nextSocial = (await socialResponse.json()) as SocialPayload;
        setSocialData(nextSocial);
        if (!activeThreadId && nextSocial.directThreads[0]) {
          setActiveThreadId(nextSocial.directThreads[0].id);
        }
      }
    }

    void syncAndLoadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentUser?.id]);

  // Social data refresh (explicit actions only — not presence-driven)
  useEffect(() => {
    if (!currentUser || !accessToken) {
      return;
    }

    const headers = getAuthHeaders();

    if (!headers) {
      return;
    }

    fetch("/api/social", { headers, cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          setSocialData((await response.json()) as SocialPayload);
        }
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, accessToken]);

  // Sync profile draft from currentUser
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const nextSnapshot = profileSnapshotKey(currentUser);

    // If the draft is dirty, NEVER overwrite it unless the user literally changed accounts
    if (profileDraftDirtyRef.current) {
      if (lastProfileSyncRef.current && !lastProfileSyncRef.current.includes(currentUser.id)) {
        profileDraftDirtyRef.current = false;
      } else {
        return;
      }
    }

    if (!profileDraftDirtyRef.current || lastProfileSyncRef.current !== nextSnapshot) {
      setProfileName(currentUser.name);
      setProfileHandle(currentUser.handle);
      setProfileAvatarUrl(currentUser.avatarUrl ?? "");
      setProfileBio(currentUser.bio ?? "");
      lastProfileSyncRef.current = nextSnapshot;
      profileDraftDirtyRef.current = false;
    }
  }, [currentUser]);

  return {
    data,
    setData,
    activeServerId,
    setActiveServerId,
    activeTextChannelId,
    setActiveTextChannelId,
    activeVoiceChannelId,
    setActiveVoiceChannelId,
    socialData,
    setSocialData,
    activeThreadId,
    setActiveThreadId,
    profileName,
    profileHandle,
    profileAvatarUrl,
    profileBio,
    setProfileName,
    setProfileHandle,
    setProfileAvatarUrl,
    setProfileBio,
    profileDraftDirtyRef,
    lastProfileSyncRef
  };
}
