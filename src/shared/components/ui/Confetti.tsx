"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#4CAF82", "#FFFFFF", "#F5A623", "#A3CF8A", "#FFCC44", "#FF8A65"];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  rotation: number; rotationSpeed: number;
  isRect: boolean;
}

interface Props {
  onDone: () => void;
  compact?: boolean;
}

export function Confetti({ onDone, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const particleCount = compact ? 40 : 90;
  const durationFrames = compact ? 120 : 200;
  const fadeStart = compact ? 80 : 140;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 2 + 1.5,
      size: Math.random() * 7 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.18,
      isRect: Math.random() > 0.4,
    }));

    let frame = 0;
    let animId: number;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const fadeProgress = frame >= fadeStart
        ? (frame - fadeStart) / (durationFrames - fadeStart)
        : 0;
      const globalAlpha = Math.max(0, 1 - fadeProgress);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.99; // air resistance
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = globalAlpha;
        ctx.fillStyle = p.color;
        if (p.isRect) {
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (frame < durationFrames) {
        animId = requestAnimationFrame(tick);
      } else {
        onDoneRef.current();
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [compact, durationFrames, fadeStart, particleCount]);

  // Portal a document.body — nunca debe quedar anidado dentro de un
  // motion.div en animación (ej. el AnimatePresence de cambio de tab en
  // LifeDashboardView.tsx), o su `position: fixed` queda contenido por el
  // transform del padre en vez de cubrir el viewport real.
  return createPortal(
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
      aria-hidden="true"
    />,
    document.body
  );
}
