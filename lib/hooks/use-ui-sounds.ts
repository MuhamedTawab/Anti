"use client";

import { useRef, useCallback } from "react";

export function useUiSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playUiSound = useCallback((kind: "send" | "receive" | "success" | "error" | "join" | "leave") => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      void context.resume().catch(() => null);
    }

    const presets: Record<typeof kind, Array<{ frequency: number; duration: number; volume: number }>> = {
      send: [
        { frequency: 740, duration: 0.05, volume: 0.018 },
        { frequency: 880, duration: 0.07, volume: 0.014 }
      ],
      receive: [
        { frequency: 520, duration: 0.05, volume: 0.018 },
        { frequency: 660, duration: 0.08, volume: 0.015 }
      ],
      success: [
        { frequency: 620, duration: 0.06, volume: 0.018 },
        { frequency: 780, duration: 0.06, volume: 0.016 },
        { frequency: 930, duration: 0.08, volume: 0.014 }
      ],
      error: [
        { frequency: 290, duration: 0.08, volume: 0.02 },
        { frequency: 220, duration: 0.1, volume: 0.018 }
      ],
      join: [
        { frequency: 440, duration: 0.05, volume: 0.018 },
        { frequency: 660, duration: 0.06, volume: 0.015 },
        { frequency: 880, duration: 0.08, volume: 0.012 }
      ],
      leave: [
        { frequency: 880, duration: 0.05, volume: 0.014 },
        { frequency: 660, duration: 0.06, volume: 0.015 },
        { frequency: 440, duration: 0.08, volume: 0.018 }
      ]
    };

    let startAt = context.currentTime;

    presets[kind].forEach((tone) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(tone.volume, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.duration);

      startAt += tone.duration * 0.75;
    });
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    return context;
  }, []);

  return { playUiSound, getAudioContext };
}
