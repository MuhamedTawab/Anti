/**
 * Nightlink Voice Engine V13 (External Singleton)
 * This class lives outside of the React lifecycle to prevent 
 * "Focus Death" caused by component re-renders on tab refocus.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export class VoiceEngine {
  private static instance: VoiceEngine;
  public localStream: MediaStream | null = null;
  public peerConnections: Record<string, RTCPeerConnection> = {};
  public signalingChannel: any = null;
  public audioContext: AudioContext | null = null;
  public isConnected = false;

  private constructor() {}

  public static getInstance(): VoiceEngine {
    if (!VoiceEngine.instance) {
      VoiceEngine.instance = new VoiceEngine();
    }
    return VoiceEngine.instance;
  }

  public cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
    this.isConnected = false;
  }
}

export const voiceEngine = VoiceEngine.getInstance();
