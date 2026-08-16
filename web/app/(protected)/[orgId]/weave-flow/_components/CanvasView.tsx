"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import ProjectNode, {
  type ProjectNodeData,
} from "@/app/(protected)/weave-flow/_components/ProjectNode";

const MOCK_NODES: Node<ProjectNodeData>[] = [
  {
    id: "epic-discovery",
    type: "project",
    position: { x: 0, y: 100 },
    data: {
      title: "Descoberta de plataforma unificada",
      description:
        "A Weave consolida sinais de discovery para priorizar épicos com impacto executivo, sem descer ao nível de tarefas individuais.",
      role: "Discovery",
      aiStatus: {
        health: "healthy",
        message: "",
      },
    },
  },
  {
    id: "epic-design",
    type: "project",
    position: { x: 340, y: 100 },
    data: {
      title: "Design do fluxo de valor",
      description:
        "A Weave mapeia o fluxo Discovery → Rollout como narrativa de entrega, visível para CTOs e COOs em um único canvas.",
      role: "Design",
      aiStatus: {
        health: "healthy",
        message: "",
      },
    },
  },
  {
    id: "epic-rollout",
    type: "project",
    position: { x: 700, y: 100 },
    data: {
      title: "Rollout multi-região",
      description:
        "A Weave acompanha dependências de rollout entre macro-projetos, mantendo o foco em marcos e riscos sistêmicos.",
      role: "Rollout",
      aiStatus: {
        health: "at_risk",
        message:
          "A Weave identificou atraso provável entre validação técnica e execução: revisar marcos de handoff antes do próximo steering.",
      },
    },
  },
];

const MOCK_EDGES: Edge[] = [
  {
    id: "e1",
    source: "epic-discovery",
    target: "epic-design",
    type: "smoothstep",
  },
  {
    id: "e2",
    source: "epic-design",
    target: "epic-rollout",
    type: "smoothstep",
  },
];

const defaultEdgeOptions = {
  style: { stroke: "rgb(163 163 163)", strokeWidth: 1.25 },
  className: "dark:!stroke-neutral-500",
};

export default function CanvasView() {
  const [nodes, , onNodesChange] = useNodesState(MOCK_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(MOCK_EDGES);

  const nodeTypes = useMemo(() => ({ project: ProjectNode }), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
    },
    [setEdges]
  );

  const onInit = useCallback((instance: ReactFlowInstance<Node<ProjectNodeData>, Edge>) => {
    instance.fitView({ padding: 0.2, duration: 200 });
  }, []);

  const showEmptyOverlay = nodes.length === 0;

  return (
    <div className="relative min-h-0 min-w-0 flex-1 bg-neutral-50 dark:bg-[#1d1d1b]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.35}
        maxZoom={1.65}
        className="!bg-transparent"
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background
          id="weave-flow-dots"
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="rgb(82 82 82 / 0.14)"
          className="dark:!bg-transparent [&_svg]:dark:opacity-40"
        />
        <Controls
          className="!m-3 !overflow-hidden !rounded-lg !border !border-neutral-200/90 !bg-white/90 !shadow-sm !backdrop-blur-md dark:!border-neutral-700/80 dark:!bg-neutral-900/85"
          showInteractive={false}
        />
      </ReactFlow>

      {showEmptyOverlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 py-12">
          <div className="max-w-md rounded-xl border border-neutral-200/80 bg-white/80 px-6 py-6 text-center shadow-sm backdrop-blur-md dark:border-neutral-700/70 dark:bg-neutral-950/60">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              A Weave organiza macro-projetos neste canvas quando existem épicos para exibir.
              Adicione épicos à visão para ver o fluxo de valor entre Discovery e Rollout.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
