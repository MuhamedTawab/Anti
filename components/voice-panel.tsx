"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { 
  Maximize2, 
  Mic, 
  MicOff, 
  MonitorUp, 
  MonitorX, 
  Radio, 
  Users, 
  Volume2, 
  Headphones, 
  Hand, 
  Keyboard,
  PhoneOff
} from "lucide-react";

import { useBlaze } from "@/lib/context";
import type { Member } from "@/lib/types";

export function VoiceMemberRow({
  member,
  isSpeaking,
  videoStream
}: {
  member: Member;
  isSpeaking: boolean;
  videoStream?: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/20 px-3 py-3 transition hover:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 font-display text-sm transition-all duration-300",
              isSpeaking && "ring-2 ring-[#ff3b5f]/80 shadow-[0_0_22px_rgba(255,59,95,0.4)] scale-105"
            )}
          >
            {/* Kinetic Aura Pulse Rings */}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-2xl ring-4 ring-[#ff3b5f]/40 animate-[ping_1.5s_infinite]" />
                <div className="absolute inset-0 rounded-2xl ring-8 ring-[#ff3b5f]/20 animate-[ping_2s_infinite] delay-300" />
                <div className="absolute inset-x-0 -bottom-1 h-3 bg-gradient-to-t from-[#ff3b5f]/20 to-transparent blur-md animate-pulse" />
              </>
            )}

            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <div className="text-white/40 uppercase font-bold">{member.name.slice(0, 1)}</div>
            )}
            <span
              className={clsx(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#111214] z-10",
                isSpeaking
                  ? "bg-[#ff3b5f] shadow-[0_0_8px_#ff3b5f]"
                  : member.status === "online"
                    ? "bg-[#23a559]"
                    : member.status === "idle"
                      ? "bg-amber-400"
                      : "bg-[#da373c]"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{member.name}</p>
            <p className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-wider">
              {isSpeaking ? "Speaking now" : member.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {videoStream && <MonitorUp size={14} className="text-[#ff3b5f] animate-pulse" />}
          {isSpeaking && <Volume2 size={16} className="animate-pulse text-[#ff3b5f]" />}
        </div>
      </div>
      {videoStream && (
        <div className="group/video mt-2 overflow-hidden rounded-xl bg-black/40 aspect-video relative ring-1 ring-white/10 transition-all hover:ring-[#ff3b5f]/50">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <button
            onClick={() => videoRef.current?.requestFullscreen().catch(() => null)}
            className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white/60 backdrop-blur opacity-0 transition group-hover/video:opacity-100 hover:text-white hover:bg-[#ff3b5f]"
            title="Fullscreen"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export function VoicePanel() {
  const {
    activeVoiceChannel,
    activeMembers: members,
    joinedVoiceRoomId,
    isMuted: muted,
    setIsMuted,
    isDeafened: deafened,
    setIsDeafened,
    isPushToTalk: pushToTalk,
    setIsPushToTalk,
    isVoiceConnecting: connecting,
    voiceConnectionStatus: connectionStatus,
    signalLevels,
    outputVolume,
    setOutputVolume,
    isScreenSharing,
    handleScreenShareToggle,
    handleVoiceToggle,
    remoteVideoStreams,
    participantLevels,
    pushToTalkKey,
    setPushToTalkKey,
    isRecordingPTT,
    setIsRecordingPTT,
    sendReaction,
    currentUser, 
    accessToken, 
    authLoading, 
    authMessage, 
    setAuthMessage, 
    handleSaveProfile, 
    profileName, 
    profileHandle, 
    profileAvatarUrl, 
    profileBio, 
    handleProfileNameChange, 
    handleProfileHandleChange, 
    handleProfileAvatarUrlChange, 
    handleProfileBioChange 
  } = useBlaze();

  const joined = !!joinedVoiceRoomId;
  const roomName = activeVoiceChannel?.name ?? "Voice";

  return (
    <div className="flex h-full flex-col bg-[#111214]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4 py-3 bg-[#111214]/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Radio size={16} className={clsx(joined ? "text-[#ff3b5f]" : "text-[#9da0a7]")} />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">{roomName}</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1">
          <Users size={12} className="text-[#9da0a7]" />
          <span className="text-[10px] font-bold text-white">{members.length}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {members.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-30 grayscale uppercase tracking-widest text-[10px]">
            <Radio size={32} className="mb-4" />
            <p>Room is empty</p>
          </div>
        ) : (
          members.map((member) => (
            <VoiceMemberRow
              key={member.id}
              member={member}
              isSpeaking={(participantLevels[member.id] ?? 0) > 0.05}
              videoStream={remoteVideoStreams[member.id]}
            />
          ))
        )}
      </div>

      {!joined && (
        <div className="mx-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <button
            onClick={() => handleVoiceToggle(activeVoiceChannel?.id ?? null)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#23a559] to-[#2dc770] py-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-xl shadow-[#23a559]/20 transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-[#23a559]/30"
          >
            <Volume2 size={20} />
            Join Voice Room
          </button>
        </div>
      )}

      {/* Connection & Controls Area */}
      <div className="mt-auto border-t border-white/5 bg-[#18191c]/80 p-4 backdrop-blur-md">
        {/* Kinetic Energy Bar */}
        <div className="mb-4 flex items-center justify-between gap-2 px-1">
          {["🔥", "❤️", "😂", "😮", "🚀"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-all hover:scale-125 hover:bg-white/10 active:scale-95 active:bg-[#ff3b5f]/20"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Connection Status Banner */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div 
                className={clsx(
                  "h-2 w-2 rounded-full",
                  connectionStatus === "connected" ? "bg-[#23a559]" : 
                  connectionStatus === "connecting" ? "bg-amber-400" : "bg-[#9da0a7]"
                )} 
              />
              {connectionStatus === "connected" && <div className="absolute inset-0 rounded-full bg-[#23a559] animate-ping opacity-50" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white truncate">
                {connectionStatus === "connected" ? "Voice Connected" : 
                 connectionStatus === "connecting" ? "Connecting..." : "Voice Idle"}
              </span>
              <span className="text-[9px] font-medium text-[#9da0a7] truncate">{roomName} / HQ</span>
            </div>
          </div>
        </div>

        {/* Level Bars (Interactive Warp EQ) */}
        <div 
          className="relative mb-6 flex items-end justify-center gap-[3px] h-12 px-6 group cursor-ew-resize pt-4"
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const setVol = (clientX: number) => {
              const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
              setOutputVolume(x / rect.width);
            };
            setVol(e.clientX);
            
            const onMouseMove = (ev: MouseEvent) => setVol(ev.clientX);
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
        >
           {/* EQ Backdrop Track */}
           <div className="absolute inset-x-6 bottom-0 h-1 bg-white/5 rounded-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] transition-all duration-200" 
               style={{ width: `${outputVolume * 100}%` }}
             />
           </div>

           {signalLevels.map((lvl, i) => {
             const barPos = i / (signalLevels.length - 1);
             const isActiveBar = barPos <= outputVolume;
             return (
               <div 
                 key={i} 
                 className={clsx(
                   "w-1 rounded-full transition-all duration-75",
                   isActiveBar 
                    ? "bg-gradient-to-t from-[#ff3b5f] to-[#ff8a5b]" 
                    : "bg-white/10"
                 )}
                 style={{ 
                   height: `${lvl}%`, 
                   opacity: connectionStatus === 'connected' ? (isActiveBar ? 1 : 0.3) : 0.1,
                   boxShadow: (isActiveBar && (lvl > 60)) ? '0 0 12px rgba(255,59,95,0.4)' : 'none'
                 }}
               />
             );
           })}
        </div>

        {/* Controls Layout */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => setIsMuted((v) => !v)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                muted ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
              )}
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{muted ? "Muted" : "Active"}</span>
            </button>
            <button
               onClick={() => setIsDeafened((v) => !v)}
               className={clsx(
                 "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                 deafened ? "bg-[#da373c] text-white shadow-lg shadow-[#da373c]/20" : "bg-white/5 text-[#dbdee1] hover:bg-white/10"
               )}
            >
              <Headphones size={14} />
              <span>{deafened ? "Deafened" : "Sound On"}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={handleScreenShareToggle}
              className={clsx(
                "flex h-10 items-center justify-center rounded-xl transition-all",
                isScreenSharing ? "bg-[#23a559] text-white" : "bg-white/5 text-[#9da0a7] hover:bg-white/10"
              )}
              title="Screen Share"
            >
              {isScreenSharing ? <MonitorX size={18} /> : <MonitorUp size={18} />}
            </button>
            <div className={clsx(
              "col-span-2 flex items-center gap-1 rounded-xl p-1 transition-all",
              pushToTalk ? "bg-[#ff3b5f]/10 ring-1 ring-[#ff3b5f]/30" : "bg-white/5"
            )}>
              <button
                onClick={() => setIsPushToTalk((v) => !v)}
                className={clsx(
                  "flex h-8 w-8 min-w-[32px] items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95",
                  pushToTalk ? "bg-[#ff3b5f] text-white shadow-lg shadow-[#ff3b5f]/20" : "text-[#9da0a7] hover:bg-white/5 hover:text-white"
                )}
                title="Toggle Push to Talk"
              >
                {pushToTalk ? <Hand size={16} /> : <Keyboard size={16} />}
              </button>
              
              <button
                onClick={() => {
                  if (!pushToTalk) setIsPushToTalk(true);
                  setIsRecordingPTT(true);
                }}
                className={clsx(
                  "flex-1 h-8 px-2 flex items-center justify-center gap-1 rounded-lg border border-transparent transition-all",
                  isRecordingPTT 
                    ? "bg-[#ff3b5f]/20 border-[#ff3b5f]/40 text-[#ff3b5f] animate-pulse" 
                    : "hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-[#9da0a7] hover:text-white overflow-hidden"
                )}
                title="Change PTT Key"
              >
                {isRecordingPTT ? (
                  <span className="animate-in fade-in zoom-in-75 duration-300">Recording...</span>
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="opacity-40 font-bold shrink-0">Key:</span>
                    <span className="text-white truncate">{pushToTalkKey.replace('Key', '').replace('Digit', '')}</span>
                  </div>
                )}
              </button>
            </div>
            <button 
              className="flex h-10 items-center justify-center rounded-xl bg-white/5 text-[#9da0a7] hover:bg-white/10 transition-all"
              title="Activity"
            >
              <Radio size={18} />
            </button>
            <button 
              onClick={() => handleVoiceToggle(activeVoiceChannel?.id ?? null)}
              className={clsx(
                "flex h-10 items-center justify-center rounded-xl transition-all",
                joined ? "bg-[#da373c]/10 text-[#da373c] hover:bg-[#da373c] hover:text-white" : "bg-[#23a559]/10 text-[#23a559] hover:bg-[#23a559] hover:text-white"
              )}
              title={joined ? "Leave Voice" : "Join Voice"}
            >
               {joined ? <PhoneOff size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
