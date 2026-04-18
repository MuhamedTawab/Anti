"use client";

import { useEffect, useState, useRef } from "react";
import { useNightlink } from "@/lib/context";

interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  scale: number;
  rotation: number;
  rotVel: number;
}

export function ReactionEngine() {
  const { activeReactions } = useNightlink();
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastProcessedId = useRef<Set<string>>(new Set<string>());
  const requestRef = useRef<number>(undefined);

  // Spawn particles when new reactions arrive
  useEffect(() => {
    activeReactions.forEach(reaction => {
      if (!lastProcessedId.current.has(reaction.id)) {
        lastProcessedId.current.add(reaction.id);
        
        // Create new particle
        const newParticle: Particle = {
          id: reaction.id,
          emoji: reaction.emoji,
          x: 50 + (Math.random() * 20 - 10), // Start near bottom center
          y: 90, // Start at 90% from top
          vx: (Math.random() - 0.5) * 0.4, // Small horizontal drift
          vy: -1.0 - Math.random() * 1.5, // Initial "pop" velocity
          opacity: 1,
          scale: 0.5 + Math.random() * 1.0,
          rotation: (Math.random() - 0.5) * 45,
          rotVel: (Math.random() - 0.5) * 5
        };

        setParticles(prev => [...prev, newParticle]);

        // Auto-cleanup tracked ID after a while
        setTimeout(() => {
          lastProcessedId.current.delete(reaction.id);
        }, 10000);
      }
    });
  }, [activeReactions]);

  // Physics Loop
  const animate = (time: number) => {
    setParticles(prev => {
      if (prev.length === 0) return prev;

      return prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.04, // Gravity
          opacity: p.opacity - 0.005, // Fade out
          rotation: p.rotation + p.rotVel
        }))
        .filter(p => p.opacity > 0 && p.y < 120); // Remove when disappeared or fallen off
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute text-4xl select-none will-change-transform drop-shadow-2xl"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            transform: `translate(-50%, -50%) scale(${p.scale}) rotate(${p.rotation}deg)`,
            filter: `blur(${Math.max(0, (1 - p.opacity) * 4)}px)`
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
