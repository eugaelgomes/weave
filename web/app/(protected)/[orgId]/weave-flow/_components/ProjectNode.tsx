"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

/** AI health signal for predictive indicators on the canvas. */
export type ProjectAiHealth = "healthy" | "at_risk";

/** Payload for the Weave Flow project (macro-epic) card node. */
export type ProjectNodeData = {
  title: string;
  description: string;
  role: string;
  aiStatus: {
    health: ProjectAiHealth;
    message: string;
  };
};

function ProjectNodeComponent({ data }: NodeProps<Node<ProjectNodeData>>) {
  const isAtRisk = data.aiStatus.health === "at_risk";
  const showAiMessage = isAtRisk && Boolean(data.aiStatus.message?.trim());

  return (
    <div
      className={cn(
        "relative flex max-w-xs min-w-[min(18rem,calc(100vw-4rem))] flex-col gap-3 rounded-xl border px-4 py-4 backdrop-blur-md transition-shadow duration-300 ease-out",
        "bg-white/75 ring-1 ring-neutral-950/[0.06] dark:bg-neutral-950/55 dark:ring-white/[0.08]",
        isAtRisk
          ? "border-orange-500/25 shadow-lg shadow-orange-500/20 ring-orange-500/10"
          : "border-neutral-200/80 shadow-sm dark:border-neutral-700/70"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-neutral-400 !bg-neutral-200 dark:!border-neutral-600 dark:!bg-neutral-800"
      />

      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-medium tracking-[0.2em] text-neutral-500 uppercase dark:text-neutral-400">
          {data.role}
        </p>
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {data.title}
        </h3>
      </div>

      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        {data.description}
      </p>

      {showAiMessage ? (
        <div
          className="flex flex-col border-t border-orange-500/20 pt-3 dark:border-orange-400/25"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {data.aiStatus.message}
          </p>
        </div>
      ) : null}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-neutral-400 !bg-neutral-200 dark:!border-neutral-600 dark:!bg-neutral-800"
      />
    </div>
  );
}

const ProjectNode = memo(ProjectNodeComponent);
ProjectNode.displayName = "ProjectNode";

export default ProjectNode;
