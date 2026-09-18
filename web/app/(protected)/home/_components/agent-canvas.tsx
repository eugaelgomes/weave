"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, MousePointer, Hand, Grid, Plus, Bot } from "lucide-react";
import { useTheme } from "@/app/_contexts/theme-context";
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";
import AgentNode from "./agent-node";
import { useRouter } from "next/navigation";

type ToolType = "select" | "hand";

export default function AgentCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { agents, loading, loadAgents } = useAgent();
  const router = useRouter();

  // Canvas Pan & Zoom State (horizontal pan is locked to 0)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Spacebar toggle for Hand Tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isSpacePressed &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  // Handle Zoom In / Out
  const handleZoom = useCallback((delta: number, clientCenter?: { x: number; y: number }) => {
    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(Number((prevZoom + delta).toFixed(2)), 0.35), 2.5);
      if (newZoom === prevZoom) return prevZoom;

      if (clientCenter && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseY = clientCenter.y - rect.top;

        setPan((prevPan) => ({
          x: 0,
          y: mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom),
        }));
      }
      return newZoom;
    });
  }, []);

  // Recenter / Reset View
  const handleResetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Handle Wheel (Zoom & Vertical Pan strictly like canvas)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // If ctrl / cmd key or pinch gesture -> Zoom
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.003;
        handleZoom(zoomDelta, { x: e.clientX, y: e.clientY });
      } else {
        // Regular wheel pans canvas strictly vertically
        setPan((prev) => ({
          x: 0,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  // Mouse Down: start vertical panning (ignore interactive targets)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [data-canvas-interactive]")) {
      return;
    }

    setIsPanning(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: 0,
      panY: pan.y,
    };
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !dragStartRef.current) return;

    const deltaY = e.clientY - dragStartRef.current.y;

    setPan({
      x: 0,
      y: dragStartRef.current.panY + deltaY,
    });
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    dragStartRef.current = null;
  };

  // Open modal handlers
  const handleCreateAgent = () => {
    router.push("/agents/new");
  };

  const handleEditAgent = (agent: Agent) => {
    router.push(`/agents/${agent.id}`);
  };

  const cursorClass = isPanning
    ? "cursor-grabbing"
    : isSpacePressed || activeTool === "hand"
      ? "cursor-grab"
      : "cursor-default";

  const isDark = theme === "dark";
  const dotColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.16)";

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={cn(
        "relative h-full w-full flex-1 touch-none overflow-hidden select-none",
        "bg-[#f4f5f8] dark:bg-[#1e1e1e]",
        cursorClass
      )}
      style={
        showGrid
          ? {
              backgroundImage: `radial-gradient(circle, ${dotColor} 1.25px, transparent 1.25px)`,
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `0px ${pan.y}px`,
            }
          : undefined
      }
    >
      {/* ========================================================================= */}
      {/* CANVAS TRANSFORMED LAYER (Agentes renderizados no quadro pontilhado)      */}
      {/* ========================================================================= */}
      <div
        className="pointer-events-none absolute inset-0 flex justify-center"
        style={{
          transform: `translate3d(0px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: "50% 0px",
        }}
      >
        <div className="pointer-events-auto w-full max-w-6xl px-8 py-16">
          {/* Canvas Section Indicator */}
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Quadro de Agentes
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {agents.length} {agents.length === 1 ? "agente" : "agentes"}
              </span>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && agents.length === 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-neutral-200/60 bg-white/60 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && agents.length === 0 && (
            <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-neutral-300 bg-white/85 p-10 text-center shadow-lg backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/85">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-md dark:bg-white dark:text-neutral-900">
                <Bot size={28} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Nenhum agente no quadro
              </h3>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                Crie agentes inteligentes com instruções e ferramentas personalizadas para organizar
                seu fluxo de trabalho.
              </p>
              <button
                type="button"
                onClick={handleCreateAgent}
                className="mt-6 flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>Criar Primeiro Agente</span>
              </button>
            </div>
          )}

          {/* Agents Grid */}
          {agents.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentNode key={agent.id} agent={agent} onEdit={handleEditAgent} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR (Barra Inferior Estilo Quadro)                          */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-neutral-200/90 bg-white/90 p-1 shadow-lg shadow-black/5 backdrop-blur-md dark:border-neutral-700/80 dark:bg-neutral-900/90 dark:shadow-black/40">
          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            title="Selecionar (V)"
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition",
              activeTool === "select" && !isSpacePressed
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            )}
          >
            <MousePointer size={15} />
          </button>

          {/* Hand / Pan Tool */}
          <button
            type="button"
            onClick={() => setActiveTool("hand")}
            title="Mover tela (H / Espaço)"
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition",
              activeTool === "hand" || isSpacePressed
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            )}
          >
            <Hand size={15} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            title={showGrid ? "Ocultar pontos do grid" : "Exibir pontos do grid"}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition",
              showGrid
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
            )}
          >
            <Grid size={15} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* Reset / Center View Button */}
          <button
            type="button"
            onClick={handleResetView}
            title="Recentralizar quadro (100%)"
            className="flex size-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RotateCcw size={14} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* + Novo Agente Button (Opção 1) */}
          <button
            type="button"
            onClick={handleCreateAgent}
            title="Adicionar Novo Agente"
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Novo Agente</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZOOM CONTROLS (HUD Flutuante de Zoom no Canto Inferior Direito)            */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute right-4 bottom-4 z-40">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-neutral-200/90 bg-white/90 p-1 shadow-md shadow-black/5 backdrop-blur-md dark:border-neutral-700/80 dark:bg-neutral-900/90">
          <button
            type="button"
            onClick={() => handleZoom(-0.15)}
            title="Diminuir zoom (-)"
            className="flex size-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 active:scale-95 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ZoomOut size={13} />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            title="Clique para redefinir para 100%"
            className="px-2 font-mono text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => handleZoom(0.15)}
            title="Aumentar zoom (+)"
            className="flex size-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 active:scale-95 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

    </div>
  );
}
