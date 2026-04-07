"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "@/lib/types";

export interface VoiceRoomResult {
  joinedVoiceRoomId: string | null;
  setJoinedVoiceRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  voiceParticipants: number | null;
  setVoiceParticipants: React.Dispatch<React.SetStateAction<number | null>>;
  isVoiceConnecting: boolean;
  setIsVoiceConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isDeafened: boolean;
  setIsDeafened: React.Dispatch<React.SetStateAction<boolean>>;
  isPushToTalk: boolean;
  setIsPushToTalk: React.Dispatch<React.SetStateAction<boolean>>;
  isPushToTalkActive: boolean;
  setIsPushToTalkActive: React.Dispatch<React.SetStateAction<boolean>>;
  isScreenSharing: boolean;
  handleScreenShareToggle: () => Promise<void>;
  remoteVideoStreams: Record<string, MediaStream>;
  pushToTalkKey: string;
  setPushToTalkKey: (key: string) => void;
  voiceConnectionStatus: "idle" | "connecting" | "connected" | "reconnecting" | "failed";
  setVoiceConnectionStatus: React.Dispatch<React.SetStateAction<"idle" | "connecting" | "connected" | "reconnecting" | "failed">>;
  outputVolume: number;
  setOutputVolume: React.Dispatch<React.SetStateAction<number>>;
  signalLevels: number[];
  participantLevels: Record<string, number>;
  roomActivityLevel: number;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  voiceSignalChannelRef: React.MutableRefObject<RealtimeChannel | null>;
  peerConnectionsRef: React.MutableRefObject<Record<string, RTCPeerConnection>>;
  attachAnalyser: (stream: MediaStream, key: string) => void;
  cleanupPeer: (remoteUserId: string) => void;
  cleanupVoiceSession: () => void;
  leaveVoiceRoom: (forcedServerId?: string) => Promise<void>;
  createPeerConnection: (remoteUserId: string) => RTCPeerConnection;
  handleVoiceToggle: (activeVoiceChannelId: string | null) => Promise<void>;
}

export function useVoiceRoom(
  supabase: SupabaseClient | null,
  currentUser: AuthIdentity | null,
  activeServerId: string,
  playUiSound: (kind: "error" | "leave" | "join") => void,
  getAudioContext: () => AudioContext | null,
  setError: (err: string | null) => void,
  sendVoiceSignal: (payload: Record<string, unknown>, channel: RealtimeChannel | null) => Promise<void>
): VoiceRoomResult {
  const voiceSignalChannelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRefs = useRef<Record<string, AnalyserNode>>({});
  const audioSourceRefs = useRef<Record<string, MediaStreamAudioSourceNode>>({});
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const signalRafRef = useRef<number | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatNodesRef = useRef<{ osc: OscillatorNode; dest: MediaStreamAudioDestinationNode } | null>(null);

  const [joinedVoiceRoomId, setJoinedVoiceRoomId] = useState<string | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<number | null>(null);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});
  const [pushToTalkKey, setPushToTalkKeyState] = useState("Space");

  useEffect(() => {
    const saved = localStorage.getItem("nightlink_ptt_key");
    if (saved) {
      setPushToTalkKeyState(saved);
    }
  }, []);

  const setPushToTalkKey = useCallback((key: string) => {
    localStorage.setItem("nightlink_ptt_key", key);
    setPushToTalkKeyState(key);
  }, []);
  const [voiceConnectionStatus, setVoiceConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "failed"
  >("idle");
  const [outputVolume, setOutputVolume] = useState(0.82);
  const [signalLevels, setSignalLevels] = useState([14, 18, 12, 22, 16, 24, 13, 19, 15, 21]);
  const [participantLevels, setParticipantLevels] = useState<Record<string, number>>({});
  const [roomActivityLevel, setRoomActivityLevel] = useState(0);

  function getRtcConfiguration(): RTCConfiguration {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnPassword = process.env.NEXT_PUBLIC_TURN_PASSWORD;

    const baseConfig: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };

    if (turnUrl && turnUsername && turnPassword && baseConfig.iceServers) {
      baseConfig.iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnPassword
      });
    }

    return baseConfig;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
          void ctx.resume();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [getAudioContext]);

  function measureAnalyserLevel(analyser: AnalyserNode | null) {
    if (!analyser) {
      return 0;
    }

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let total = 0;
    for (const value of data) {
      total += Math.abs(value - 128);
    }

    return Math.min(1, total / data.length / 36);
  }

  function attachAnalyser(stream: MediaStream, key: string) {
    const context = getAudioContext();
    if (!context) return null;

    if (context.state === "suspended") {
      void context.resume().catch(() => null);
    }

    audioSourceRefs.current[key]?.disconnect();

    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.82;

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    audioSourceRefs.current[key] = source;

    if (key === "local") {
      localAnalyserRef.current = analyser;
    } else {
      remoteAnalyserRefs.current[key] = analyser;
    }

    return analyser;
  }

  function cleanupPeer(remoteUserId: string) {
    peerConnectionsRef.current[remoteUserId]?.close();
    delete peerConnectionsRef.current[remoteUserId];
    remoteAudioRef.current[remoteUserId]?.pause();
    delete remoteAudioRef.current[remoteUserId];
    audioSourceRefs.current[remoteUserId]?.disconnect();
    delete audioSourceRefs.current[remoteUserId];
    delete remoteAnalyserRefs.current[remoteUserId];
  }

  function cleanupVoiceSession() {
    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localScreenStreamRef.current = null;
    audioSourceRefs.current.local?.disconnect();
    delete audioSourceRefs.current.local;
    localAnalyserRef.current = null;
    setIsMuted(false);
    setIsDeafened(false);
    setIsPushToTalkActive(false);
    setIsScreenSharing(false);
    setRemoteVideoStreams({});
    setSignalLevels([14, 18, 12, 22, 16, 24, 13, 19, 15, 21]);
    setParticipantLevels({});
    setRoomActivityLevel(0);
    setVoiceConnectionStatus("idle");

    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.srcObject = null;
      silentAudioRef.current = null;
    }
    if (heartbeatNodesRef.current) {
      try { heartbeatNodesRef.current.osc.stop(); } catch {}
      heartbeatNodesRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }

  async function leaveVoiceRoom(forcedServerId?: string) {
    if (voiceSignalChannelRef.current && currentUser) {
      await voiceSignalChannelRef.current.send({
        type: "broadcast",
        event: "leave",
        payload: { userId: currentUser.id }
      });
    }

    cleanupVoiceSession();

    if (voiceSignalChannelRef.current && supabase) {
      void supabase.removeChannel(voiceSignalChannelRef.current);
      voiceSignalChannelRef.current = null;
    }

    setJoinedVoiceRoomId(null);
    setVoiceParticipants(null);
    setIsVoiceConnecting(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsPushToTalkActive(false);
    playUiSound("leave");
  }

  function createPeerConnection(remoteUserId: string) {
    const existing = peerConnectionsRef.current[remoteUserId];

    if (existing) {
      if (existing.connectionState === "failed" || existing.connectionState === "closed") {
        cleanupPeer(remoteUserId);
      } else {
        return existing;
      }
    }

    const peer = new RTCPeerConnection(getRtcConfiguration());

    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        peer.addTrack(track, localStreamRef.current);
      }
    });

    localScreenStreamRef.current?.getTracks().forEach((track) => {
      if (localScreenStreamRef.current) {
        peer.addTrack(track, localScreenStreamRef.current);
      }
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate || !currentUser) return;
      void sendVoiceSignal(
        {
          to: remoteUserId,
          from: currentUser.id,
          candidate: event.candidate.toJSON()
        },
        voiceSignalChannelRef.current
      );
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      const { track } = event;
      if (!stream || !track) return;

      if (track.kind === "video") {
        setRemoteVideoStreams((prev) => ({ ...prev, [remoteUserId]: stream }));
        track.onended = () => {
          setRemoteVideoStreams((prev) => {
            const next = { ...prev };
            delete next[remoteUserId];
            return next;
          });
        };
        return;
      }

      if (track.kind === "audio") {
        const existingAudio = remoteAudioRef.current[remoteUserId];
        if (existingAudio) {
          existingAudio.srcObject = stream;
          attachAnalyser(stream, remoteUserId);
          existingAudio.muted = isDeafened;
          existingAudio.volume = outputVolume;
          void existingAudio.play().catch(() => null);
          return;
        }

        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        audio.muted = isDeafened;
        audio.volume = outputVolume;
        remoteAudioRef.current[remoteUserId] = audio;
        attachAnalyser(stream, remoteUserId);
        void audio.play().catch(() => null);
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setVoiceConnectionStatus("connected");
      } else if (peer.connectionState === "disconnected") {
        setVoiceConnectionStatus("reconnecting");
      } else if (peer.connectionState === "failed") {
        setVoiceConnectionStatus("failed");
        setError("Voice connection dropped. Rejoin the room to recover.");
        playUiSound("error");
      }

      if (["failed", "closed"].includes(peer.connectionState)) {
        cleanupPeer(remoteUserId);
      }
    };

    peerConnectionsRef.current[remoteUserId] = peer;
    return peer;
  }

  async function handleVoiceToggle(activeVoiceChannelId: string | null) {
    if (!activeVoiceChannelId) return;

    if (joinedVoiceRoomId === activeVoiceChannelId) {
      await leaveVoiceRoom();
      return;
    }

    setError(null);
    setIsVoiceConnecting(true);
    setVoiceConnectionStatus("connecting");

    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      });
      attachAnalyser(localStreamRef.current, "local");
      // Triggered automatically by effect, but ensure immediate sync:
      const audioTracks = localStreamRef.current.getAudioTracks();
      const shouldTransmit = !isMuted && (!isPushToTalk || isPushToTalkActive);
      audioTracks.forEach((track) => { track.enabled = shouldTransmit; });

      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeVoiceChannelId })
      });

      if (!response.ok) {
        setError("Voice room could not connect.");
        playUiSound("error");
        cleanupVoiceSession();
        return;
      }

      const payload = (await response.json()) as { roomId: string; participants: number };
      setJoinedVoiceRoomId(payload.roomId);
      setVoiceParticipants(payload.participants);
      setIsMuted(false);
      setIsDeafened(false);
      setVoiceConnectionStatus("connected");
      playUiSound("join");

      // Start silent heartbeat to keep background tab active for audio
      if (typeof window !== "undefined") {
        const ctx = getAudioContext();
        if (ctx) {
          // If we had a previous heartbeat, stop it
          if (heartbeatNodesRef.current) {
            try { heartbeatNodesRef.current.osc.stop(); } catch {}
          }

          // Create an oscillator that creates silent but active audio processing
          const osc = ctx.createOscillator();
          const dest = ctx.createMediaStreamDestination();
          const gain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          
          gain.gain.setValueAtTime(0.0001, ctx.currentTime); // Almost silent but not zero
          
          osc.connect(gain);
          gain.connect(dest);
          
          const audio = new Audio();
          audio.srcObject = dest.stream;
          audio.muted = true; // Muted at element level, but stream is "playing"
          
          silentAudioRef.current = audio;
          heartbeatNodesRef.current = { osc, dest };
          
          void audio.play().then(() => {
            osc.start();
          }).catch(() => null);
        }

        // Periodically ping signaling channel to keep websocket warm
        pingIntervalRef.current = setInterval(() => {
          if (voiceSignalChannelRef.current && currentUser) {
            void voiceSignalChannelRef.current.send({
              type: "broadcast",
              event: "ping",
              payload: { userId: currentUser.id, timestamp: Date.now() }
            });
          }
        }, 15000); // Reduced to 15s for better background persistence
      }
    } catch {
      setError("Microphone access failed or voice could not start.");
      setVoiceConnectionStatus("failed");
      playUiSound("error");
      cleanupVoiceSession();
    } finally {
      setIsVoiceConnecting(false);
    }
  }

  async function handleScreenShareToggle() {
    if (isScreenSharing) {
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      setIsScreenSharing(false);

      // Remove video track from existing connections
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            pc.removeTrack(sender);
          }
        });
      });
      // Optionally renegotiate here if needed for robust removal, but removing track often suffices.
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        localScreenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
           void handleScreenShareToggle(); // recursively turn off
        };

        // Add track to existing peers and renegotiate
        Object.entries(peerConnectionsRef.current).forEach(async ([userId, pc]) => {
           screenStream.getTracks().forEach((track) => pc.addTrack(track, screenStream));
           if (voiceSignalChannelRef.current && currentUser) {
             const offer = await pc.createOffer();
             await pc.setLocalDescription(offer);
             await sendVoiceSignal(
               { to: userId, from: currentUser.id, description: offer },
               voiceSignalChannelRef.current
             );
           }
        });
      } catch (e) {
        setError("Could not capture screen.");
      }
    }
  }

  // Effect: Sync local audio tracks to muted state
  useEffect(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const shouldTransmit = !isMuted && (!isPushToTalk || isPushToTalkActive);
    audioTracks.forEach((track) => {
      track.enabled = shouldTransmit;
    });
  }, [isMuted, isPushToTalk, isPushToTalkActive, joinedVoiceRoomId]);

  // Effect: Prevent mic from going silent when window is minimized or tab is hidden
  useEffect(() => {
    if (!joinedVoiceRoomId) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Resume AudioContext if it was suspended by the browser
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
          void ctx.resume().catch(() => null);
        }
        // Re-apply enabled state to audio tracks to counteract browser-level suppression
        const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
        const shouldTransmit = !isMuted && (!isPushToTalk || isPushToTalkActive);
        audioTracks.forEach((track) => {
          track.enabled = shouldTransmit;
        });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [joinedVoiceRoomId, isMuted, isPushToTalk, isPushToTalkActive, getAudioContext]);

  // Effect: Sync remote audio tracks to deafened state
  useEffect(() => {
    Object.values(remoteAudioRef.current).forEach((audio) => {
      audio.muted = isDeafened;
      audio.volume = outputVolume;
    });
  }, [isDeafened, outputVolume, joinedVoiceRoomId]);

  // Effect: Push-to-talk keybind listener
  useEffect(() => {
    if (!joinedVoiceRoomId || !isPushToTalk) {
      if (isPushToTalkActive) setIsPushToTalkActive(false);
      return;
    }

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== pushToTalkKey || event.repeat || isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsPushToTalkActive(true);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== pushToTalkKey) return;
      event.preventDefault();
      setIsPushToTalkActive(false);
    }

    function handleBlur() {
      setIsPushToTalkActive(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isPushToTalk, isPushToTalkActive, joinedVoiceRoomId, pushToTalkKey]);

  // Effect: Voice signal channel setup
  useEffect(() => {
    if (!supabase || !currentUser || !joinedVoiceRoomId) {
      return;
    }

    const channel = supabase
      .channel(`nightlink-voice:${joinedVoiceRoomId}`)
      .on("broadcast", { event: "join" }, async (payload) => {
        const next = payload.payload as { userId?: string };
        if (!next.userId || next.userId === currentUser.id) return;

        const peer = createPeerConnection(next.userId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendVoiceSignal(
          { to: next.userId, from: currentUser.id, description: offer },
          channel
        );
      })
      .on("broadcast", { event: "signal" }, async (payload) => {
        const signal = payload.payload as {
          to?: string;
          from?: string;
          description?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };

        if (!signal.to || !signal.from || signal.to !== currentUser.id) return;

        const peer = createPeerConnection(signal.from);

        if (signal.description) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
          if (signal.description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendVoiceSignal(
              { to: signal.from, from: currentUser.id, description: answer },
              channel
            );
          }
        }

        if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => null);
        }
      })
      .on("broadcast", { event: "leave" }, (payload) => {
        const next = payload.payload as { userId?: string };
        if (!next.userId) return;
        cleanupPeer(next.userId);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.send({
          type: "broadcast",
          event: "join",
          payload: { userId: currentUser.id }
        });
      });

    voiceSignalChannelRef.current = channel;

    return () => {
      if (voiceSignalChannelRef.current?.topic === channel.topic) {
        void channel.send({
          type: "broadcast",
          event: "leave",
          payload: { userId: currentUser.id }
        });
        voiceSignalChannelRef.current = null;
      }
      cleanupVoiceSession();
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, joinedVoiceRoomId, supabase]);

  // Effect: Analyser activity loop
  useEffect(() => {
    let frame = 0;
    const idleLevels = [14, 18, 12, 22, 16, 24, 13, 19, 15, 21];

    function tick() {
      const liveLevels: Record<string, number> = {};
      const localLevel = measureAnalyserLevel(localAnalyserRef.current);
      if (currentUser?.id) {
        liveLevels[currentUser.id] = localLevel;
      }

      Object.entries(remoteAnalyserRefs.current).forEach(([userId, analyser]) => {
        liveLevels[userId] = measureAnalyserLevel(analyser);
      });

      let nextRoomLevel = 0;

      setParticipantLevels((current) => {
        const next: Record<string, number> = {};
        const keys = new Set([...Object.keys(current), ...Object.keys(liveLevels)]);

        keys.forEach((key) => {
          const measured = liveLevels[key] ?? 0;
          const decayed = measured > 0.035 ? measured : (current[key] ?? 0) * 0.82;
          const clamped = decayed < 0.015 ? 0 : decayed;
          next[key] = clamped;
          nextRoomLevel = Math.max(nextRoomLevel, clamped);
        });

        return next;
      });

      setRoomActivityLevel(nextRoomLevel);

      if (nextRoomLevel < 0.035) {
        setSignalLevels(idleLevels);
      } else {
        const activeWave = Date.now() / 180;
        setSignalLevels(
          idleLevels.map((base, index) => {
            const wave = (Math.sin(activeWave + index * 0.72) + 1) / 2;
            const emphasis = index % 3 === 0 ? 1.16 : index % 2 === 0 ? 0.94 : 0.82;
            const height = base + wave * 10 + nextRoomLevel * 54 * emphasis;
            return Math.max(10, Math.min(82, Math.round(height)));
          })
        );
      }

      frame = window.requestAnimationFrame(tick);
      signalRafRef.current = frame;
    }

    frame = window.requestAnimationFrame(tick);
    signalRafRef.current = frame;

    return () => {
      window.cancelAnimationFrame(frame);
      signalRafRef.current = null;
    };
  }, [currentUser?.id, joinedVoiceRoomId]);

  useEffect(() => {
    return () => {
      cleanupVoiceSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    joinedVoiceRoomId,
    setJoinedVoiceRoomId,
    voiceParticipants,
    setVoiceParticipants,
    isVoiceConnecting,
    setIsVoiceConnecting,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    isPushToTalk,
    setIsPushToTalk,
    isPushToTalkActive,
    setIsPushToTalkActive,
    voiceConnectionStatus,
    setVoiceConnectionStatus,
    outputVolume,
    setOutputVolume,
    signalLevels,
    participantLevels,
    roomActivityLevel,
    localStreamRef,
    voiceSignalChannelRef,
    peerConnectionsRef,
    attachAnalyser,
    cleanupPeer,
    cleanupVoiceSession,
    leaveVoiceRoom,
    createPeerConnection,
    handleVoiceToggle,
    pushToTalkKey,
    setPushToTalkKey,
    isScreenSharing,
    handleScreenShareToggle,
    remoteVideoStreams
  };
}
