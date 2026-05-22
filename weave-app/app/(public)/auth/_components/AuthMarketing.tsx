"use client";

import { useEffect, useState, useMemo } from "react";

export function AuthMarketing() {
  const audiences = ["você", "seu time"];
  const [activeAudience, setActiveAudience] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAudience((prev: number) => (prev + 1) % audiences.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [audiences.length]);

  // Estrutura de Constelação/Partículas (Pontos e Linhas)
  const network = useMemo(() => {
    const numNodes = 40; // Quantidade de pontos na tela
    const maxDistance = 25; // Distância máxima para conectar dois pontos
    const nodes: { x: number; y: number }[] = [];
    const connections: { from: number; to: number; opacity: number }[] = [];

    // Gera os pontos aleatoriamente dentro do espaço 100x100
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    }

    // Conecta os pontos que estão próximos
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          // Quanto mais perto, mais forte a linha
          const lineOpacity = 1 - distance / maxDistance;
          connections.push({ from: i, to: j, opacity: lineOpacity });
        }
      }
    }

    return { nodes, connections };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black px-10">
      {/* Background: Conexões de Pontos e Linhas */}
      <div className="absolute inset-0 z-0 opacity-30">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="text-brand-primary-500 h-full w-full"
        >
          <g stroke="currentColor" strokeWidth="0.1">
            {network.connections.map((conn, i) => (
              <line
                key={`line-${i}`}
                x1={network.nodes[conn.from].x}
                y1={network.nodes[conn.from].y}
                x2={network.nodes[conn.to].x}
                y2={network.nodes[conn.to].y}
                opacity={conn.opacity * 0.5} // Controle suave da opacidade da linha
              />
            ))}
          </g>
          <g fill="currentColor">
            {network.nodes.map((node, i) => (
              <circle key={`node-${i}`} cx={node.x} cy={node.y} r="0.25" opacity="0.8" />
            ))}
          </g>
        </svg>
      </div>

      {/* Texto limpo */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <p className="text-brand-secondary-500 text-4xl leading-tight font-semibold tracking-tight drop-shadow-md">
          Faça o melhor por{" "}
        </p>

        <div className="relative mt-2 h-14 w-full">
          {audiences.map((audience, index) => (
            <span
              key={audience}
              className={`text-brand-primary-500 absolute inset-0 text-center text-3xl leading-tight font-bold tracking-tight drop-shadow-lg transition-all duration-500 ${
                index === activeAudience ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              {audience}!
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
