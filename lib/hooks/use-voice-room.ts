"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { voiceEngine } from "../voice-engine";

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
  isRecordingPTT: boolean;
  setIsRecordingPTT: (val: boolean) => void;
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
  playUiSound: (kind: "error" | "leave" | "join" | "ptt_on" | "ptt_off") => void,
  getAudioContext: () => AudioContext | null,
  setError: (err: string | null) => void,
  sendVoiceSignal: (payload: Record<string, unknown>, channel: RealtimeChannel | null) => Promise<void>
): VoiceRoomResult {
  // V13: External Singleton Migration
  // Moving all core voice entities out of the React lifecycle
  // to prevent "Focus Death" on Edge/Chrome.
  const localStreamRef = useRef<MediaStream | null>(voiceEngine.localStream);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>(voiceEngine.peerConnections);
  const voiceSignalChannelRef = useRef<any>(voiceEngine.signalingChannel);
  const remoteAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRefs = useRef<Record<string, AnalyserNode>>({});
  const audioSourceRefs = useRef<Record<string, MediaStreamAudioSourceNode>>({});
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const signalRafRef = useRef<number | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatNodesRef = useRef<{ osc: AudioBufferSourceNode | OscillatorNode; dest: MediaStreamAudioDestinationNode } | null>(null);
  const voiceWorkerRef = useRef<Worker | null>(null);
  const wakeLockRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoKeepAliveRef = useRef<HTMLVideoElement | null>(null);

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

  const [isRecordingPTT, setIsRecordingPTT] = useState(false);

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
    const handleReactivate = () => {
      const isVisible = document.visibilityState === "visible";
      const isFocused = document.hasFocus();
      
      if (isVisible || isFocused) {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
          void ctx.resume();
        }
        
        // If we are in a voice room, force a signal ping to keep us alive
        if (joinedVoiceRoomId && voiceWorkerRef.current) {
          voiceWorkerRef.current.postMessage({ type: 'ping' });
        }
      }
    };
    document.addEventListener("visibilitychange", handleReactivate);
    window.addEventListener("focus", handleReactivate);
    return () => {
      document.removeEventListener("visibilitychange", handleReactivate);
      window.removeEventListener("focus", handleReactivate);
    };
  }, [getAudioContext, joinedVoiceRoomId]);

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

    return Math.min(1, total / data.length / 24);
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

    if (voiceWorkerRef.current) {
      voiceWorkerRef.current.postMessage({ type: 'stop' });
      voiceWorkerRef.current.terminate();
      voiceWorkerRef.current = null;
    }

    if (wakeLockRef.current) {
      void wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
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
    
    // V13: Commit to singleton
    peerConnectionsRef.current[remoteUserId] = peer;
    voiceEngine.peerConnections[remoteUserId] = peer;

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      voiceEngine.localStream = stream;
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

          // V6: Using a Periodic White Noise generator instead of a Sine wave.
          // White noise processing is more diverse and harder for OS power-savers to "de-prioritize".
          const bufferSize = ctx.sampleRate;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          
          const dest = ctx.createMediaStreamDestination();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, ctx.currentTime); // Virtually silent
          
          noise.connect(gain);
          gain.connect(dest);
          
          const audio = new Audio();
          audio.srcObject = dest.stream;
          audio.muted = false; // MUST be unmuted to trick OS into high-priority mode
          audio.volume = 0.001; 
          
          silentAudioRef.current = audio;
          heartbeatNodesRef.current = { osc: noise as any, dest };
          
          void audio.play().then(() => {
            noise.start();
            console.log("[Voice] V9 Omega Heartbeat (Frequency-Shift) active.");
            
            // Periodically shift grain/gain to prevent "static noise" detection
            const shiftInt = setInterval(() => {
              if (gain?.gain) {
                const current = gain.gain.value;
                gain.gain.setValueAtTime(current === 0.0001 ? 0.00015 : 0.0001, ctx.currentTime);
              }
            }, 2000);
            
            return () => clearInterval(shiftInt);
          }).catch(() => null);

          // V9: Video Keep-Alive (Canvas Trick)
          // Edge prioritizes tabs with active video streams
          if (!canvasRef.current && typeof document !== "undefined") {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            canvasRef.current = canvas;
            
            const vctx = canvas.getContext("2d");
            const stream = canvas.captureStream(1); // 1 FPS is enough to count as "active video"
            
            const video = document.createElement("video");
            video.srcObject = stream;
            video.muted = true;
            video.setAttribute("playsinline", "");
            videoKeepAliveRef.current = video;
            
            // Draw a single pixel change every few seconds to keep the stream "active"
            const drawInt = setInterval(() => {
              if (vctx) {
                vctx.fillStyle = `rgb(${Math.random()*255},0,0)`;
                vctx.fillRect(0, 0, 1, 1);
              }
            }, 5000);
            
            void video.play().catch(() => null);
          }
        }

        // Request Screen Wake Lock if available
        if ('wakeLock' in navigator) {
          try {
            (navigator as any).wakeLock.request('screen').then((lock: any) => {
              wakeLockRef.current = lock;
            });
          } catch (err) {
            console.error("[Voice] Wake Lock failed:", err);
          }
        }

        // Initialize Background Worker for High-Precision Signaling (V8: 8s interval)
        if (voiceWorkerRef.current) voiceWorkerRef.current.terminate();
        
        const worker = new Worker(new URL('/voice-worker.js', window.location.origin));
        
        worker.onmessage = (e) => {
          if (e.data.type === 'tick') {
            if (voiceSignalChannelRef.current && currentUser) {
              void voiceSignalChannelRef.current.send({
                type: 'broadcast',
                event: 'ping',
                payload: { userId: currentUser.id, heartbeat: true }
              });
            }
          }
        };
        
        worker.postMessage({ type: 'start', payload: { interval: 8000 } });
        voiceWorkerRef.current = worker;
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
        // V11: Debounced Restoration
        // We wait for the browser to "settle" before we touch the audio/network stack
        setTimeout(() => {
          const ctx = getAudioContext();
          if (ctx && ctx.state === "suspended") {
            console.log("[Voice] V11: Resuming suspended AudioContext.");
            void ctx.resume().catch(() => null);
          }
          
          // Stream Health Check: If Edge/Windows muted the track in the background, flip it back
          const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
          const shouldTransmit = !isMuted && (!isPushToTalk || isPushToTalkActive);
          
          audioTracks.forEach((track) => {
            if (track.enabled !== shouldTransmit) {
              console.log(`[Voice] V11: Restoring track to ${shouldTransmit}`);
              track.enabled = shouldTransmit;
            }
          });
          
          // PTT Cleanup: Ensure no "stuck" keys from background
          if (!isPushToTalkActive) {
            setIsPushToTalkActive(false);
          }
        }, 300);
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
      playUiSound("ptt_on");
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== pushToTalkKey) return;
      event.preventDefault();
      setIsPushToTalkActive(false);
      playUiSound("ptt_off");
    }

    function handleBlur() {
      // Browsers lose key-tracking when backgrounded. 
      // If we are in PTT mode, we must release the mic, 
      // but we add a small console log to help debug.
      if (isPushToTalkActive) {
        setIsPushToTalkActive(false);
        playUiSound("ptt_off");
        console.log("[Voice] PTT released due to focus loss (Alt-Tab). Switch to Open Mic to talk in background.");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isPushToTalk, isPushToTalkActive, joinedVoiceRoomId, pushToTalkKey, setIsPushToTalkActive]);

  // Effect: Capture next key for PTT
  useEffect(() => {
    if (!isRecordingPTT) return;

    function handleCapture(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();
      setPushToTalkKey(event.code);
      setIsRecordingPTT(false);
      console.log(`[Voice] PTT Key updated to: ${event.code}`);
    }

    window.addEventListener("keydown", handleCapture, true);
    return () => window.removeEventListener("keydown", handleCapture, true);
  }, [isRecordingPTT, setPushToTalkKey]);

  // V8: Periodic Hardware Polling & MediaSession Action Handlers
  useEffect(() => {
    if (!joinedVoiceRoomId || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    // Tell the OS we are an interactive communication tab
    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Nightlink Voice Call',
      artist: 'Active Communication',
      album: 'Nightlink Platform',
      artwork: [
        { src: '/logo.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Dummy action handlers to keep the session active
    const dummyHandler = () => { console.log("[Voice] MediaSession action ignored."); };
    navigator.mediaSession.setActionHandler('play', dummyHandler);
    navigator.mediaSession.setActionHandler('pause', dummyHandler);
    navigator.mediaSession.setActionHandler('stop', () => void leaveVoiceRoom());

    // Hardware Polling: Keep the mic stack alive
    const pollInterval = setInterval(() => {
      void navigator.mediaDevices.enumerateDevices().catch(() => null);
    }, 30000);

    return () => {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('stop', null);
      clearInterval(pollInterval);
    };
  }, [joinedVoiceRoomId, leaveVoiceRoom]);

  // Effect: Voice signal channel setup
  useEffect(() => {
    if (!supabase || !currentUser || !joinedVoiceRoomId) {
      return;
    }

    // V13: Persist channel to singleton
    if (voiceEngine.signalingChannel) {
      voiceSignalChannelRef.current = voiceEngine.signalingChannel;
      // Also ensure status is connected if we were already connected
      if (voiceEngine.isConnected) {
        setVoiceConnectionStatus("connected");
      }
      return; 
    }

    const channel = supabase
      .channel(`nightlink-voice:${joinedVoiceRoomId}`)
      .on("broadcast", { event: "join" }, async (payload) => {
        const next = payload.payload as { userId?: string };
        if (!next.userId || next.userId === currentUser.id) return;

        const peer = createPeerConnection(next.userId);
        playUiSound("join");
        
        // V6: Add ICE State monitoring to auto-restart on disconnect
        peer.oniceconnectionstatechange = () => {
          if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
             console.log(`[Voice] ICE ${peer.iceConnectionState} for ${next.userId}. Attempting background restart.`);
             void peer.createOffer({ iceRestart: true }).then(async (offer) => {
                await peer.setLocalDescription(offer);
                await sendVoiceSignal({ to: next.userId, from: currentUser.id, description: offer }, channel);
             });
          }
        };

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

        let peer = peerConnectionsRef.current[signal.from];
        if (!peer) peer = createPeerConnection(signal.from);

        // V6: Add ICE State monitoring to auto-restart on disconnect
        peer.oniceconnectionstatechange = () => {
          if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
             console.log(`[Voice] ICE ${peer.iceConnectionState} for ${signal.from}. Attempting background restart.`);
             void peer.createOffer({ iceRestart: true }).then(async (offer) => {
                await peer.setLocalDescription(offer);
                await sendVoiceSignal({ to: signal.from!, from: currentUser.id, description: offer }, channel);
             });
          }
        };

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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          voiceEngine.isConnected = true;
          voiceEngine.signalingChannel = channel;
          voiceSignalChannelRef.current = channel;
          setVoiceConnectionStatus("connected");
          void channel.send({
            type: 'broadcast',
            event: 'join',
            payload: { userId: currentUser.id }
          });
        }
      });

    voiceSignalChannelRef.current = channel;

    return () => {
      // V13: Do NOTHING on unmount. We want the channel to live in the voiceEngine singleton.
      // Unsubscribing here is what caused the "Focus Death" on Edge.
      console.log("[Voice] V13 Preservation: Holding signaling channel in singleton.");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, joinedVoiceRoomId, supabase]);

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
            const emphasis = index % 3 === 0 ? 1.25 : index % 2 === 0 ? 1.0 : 0.85;
            const height = base + wave * 8 + nextRoomLevel * 64 * emphasis;
            return Math.max(10, Math.min(94, Math.round(height)));
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
    pushToTalkKey,
    setPushToTalkKey,
    isRecordingPTT,
    setIsRecordingPTT,
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
    isScreenSharing,
    handleScreenShareToggle,
    remoteVideoStreams
  };
}
