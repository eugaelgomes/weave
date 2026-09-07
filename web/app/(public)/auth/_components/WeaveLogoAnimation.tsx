"use client";

import { useEffect, useRef } from "react";

const LOGO_LINES = [
  "  ██╗   ██╗ ███████╗  █████╗  ██╗   ██╗ ███████╗",
  "  ██║   ██║ ██╔════╝ ██╔══██╗ ██║   ██║ ██╔════╝",
  "  ██║██╗██║ █████╗   ███████║ ██║   ██║ █████╗  ",
  "  ████████║ ██╔══╝   ██╔══██║ ╚██╗ ██╔╝ ██╔══╝  ",
  "  ╚██████╔╝ ███████╗ ██║  ██║  ╚████╔╝  ███████╗",
];

const FONT_SIZE = 15;
const LINE_H = FONT_SIZE * 1.35;
const FONT = `${FONT_SIZE}px 'Courier New', Courier, monospace`;
const COL_DELAY = 120;   // ms between columns
const DROP_MS = 500;    // fall duration per piece
const HOLD_MS = 2800;   // pause after assembled
const FADE_MS = 1000;   // fade-out duration

// ease-in for gravity feel
const easeIn = (t: number) => t * t * t;

interface Piece {
  char: string;
  finalX: number;
  finalY: number;
  startMs: number;
  duration: number;
}

function buildPieces(cw: number, ch: number, charW: number): { pieces: Piece[]; lastEnd: number } {
  const cols = Math.max(...LOGO_LINES.map((l) => l.length));
  const logoW = cols * charW;
  const logoH = LOGO_LINES.length * LINE_H;
  const ox = (cw - logoW) / 2;
  const oy = (ch - logoH) / 2;

  const pieces: Piece[] = [];
  let lastEnd = 0;

  for (let row = 0; row < LOGO_LINES.length; row++) {
    for (let col = 0; col < LOGO_LINES[row].length; col++) {
      const char = LOGO_LINES[row][col];
      if (char === " ") continue;
      const dur = DROP_MS + Math.random() * 180;
      const start = col * COL_DELAY;
      lastEnd = Math.max(lastEnd, start + dur);
      pieces.push({
        char,
        finalX: ox + col * charW,
        finalY: oy + row * LINE_H,
        startMs: start,
        duration: dur,
      });
    }
  }
  return { pieces, lastEnd };
}

export function WeaveLogoAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // measure char width with the chosen font
    ctx.font = FONT;
    const charW = ctx.measureText("█").width;

    type Phase = "drop" | "hold" | "fade";
    let phase: Phase = "drop";
    let phaseStart = performance.now();
    let pieces: Piece[] = [];
    let lastEnd = 0;

    const startDrop = (now: number) => {
      const built = buildPieces(canvas.offsetWidth, canvas.offsetHeight, charW);
      pieces = built.pieces;
      lastEnd = built.lastEnd;
      phase = "drop";
      phaseStart = now;
    };

    startDrop(performance.now());

    const draw = (now: number) => {
      const elapsed = now - phaseStart;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Phase transitions
      if (phase === "drop" && elapsed > lastEnd + 200) {
        phase = "hold";
        phaseStart = now;
      } else if (phase === "hold" && elapsed > HOLD_MS) {
        phase = "fade";
        phaseStart = now;
      } else if (phase === "fade" && elapsed > FADE_MS) {
        startDrop(now);
        raf = requestAnimationFrame(draw);
        return;
      }

      // Global alpha for fade phase
      const globalAlpha =
        phase === "fade" ? Math.max(0, 1 - elapsed / FADE_MS) : 1;

      ctx.font = FONT;
      ctx.globalAlpha = globalAlpha;

      for (const p of pieces) {
        const t = Math.min(1, Math.max(0, (elapsed - p.startMs) / p.duration));
        if (t === 0) continue;

        const easedT = easeIn(t);
        // fall from above canvas top
        const startY = -LINE_H * 1.5;
        const currentY = startY + (p.finalY - startY) * easedT;

        // no shadow/blur — keep letters crisp
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(30,30,32,1)";
        ctx.fillText(p.char, p.finalX, currentY + LINE_H);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
