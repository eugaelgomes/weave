"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { toast } from "sonner";
import { useProjects } from "@/app/_contexts/projects-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { blocksToMarkdown, hasMarkdownContent } from "@/app/_utils/blocks-to-markdown";
import { markdownToInitialBlocks } from "@/app/_utils/markdown-to-initial-blocks";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import {
  emptyReasoningInstructions,
  parseReasoningInstructions,
  type ReasoningInstructions,
} from "@/app/_services/projects-service/reasoning-instructions.schema";
import { getReasoningTypeLabel } from "@/app/(protected)/home/_components/engine-utils";

const INSTRUCTION_TYPES = [
  "analysis",
  "daily_standup",
  "sprint_review",
  "sprint_kickoff",
  "deadline_alert",
] as const;

export type InstructionScope = "global" | "byType";
export type InstructionType = (typeof INSTRUCTION_TYPES)[number];

function buildInstructionTemplateBlocks(hint: string): CreateBlockData[] {
  return [
    { type: "paragraph", text: hint },
    { type: "list", text: "", properties: { attrs: { ordered: false } } },
  ];
}

export function useInstructionsDraft(
  projectId: string | null,
  onProjectIdChange: (id: string) => void
) {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.reasoningComposer.instructions;
  const engineTypes = t.home.engine.reasoningTypes;
  const { projects } = useWeaveEngine();
  const { getAiReportConfig, updateAiReportConfig } = useProjects();

  const [reportConfigLoaded, setReportConfigLoaded] = useState(false);
  const [hasReportConfig, setHasReportConfig] = useState(false);
  const [baseConfig, setBaseConfig] = useState<Awaited<ReturnType<typeof getAiReportConfig>>>(null);
  const [instructions, setInstructions] = useState<ReasoningInstructions>(
    emptyReasoningInstructions()
  );
  const [scope, setScope] = useState<InstructionScope>("global");
  const [instructionType, setInstructionType] = useState<InstructionType>("analysis");
  const [systemBlocks, setSystemBlocks] = useState<CreateBlockData[]>([]);
  const [promptBlocks, setPromptBlocks] = useState<CreateBlockData[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setReportConfigLoaded(false);
      setHasReportConfig(false);
      setBaseConfig(null);
      return;
    }

    let cancelled = false;
    setReportConfigLoaded(false);
    void getAiReportConfig(projectId)
      .then((config) => {
        if (cancelled) return;
        setBaseConfig(config);
        setHasReportConfig(Boolean(config));
        setInstructions(parseReasoningInstructions(config?.reasoning_instructions));
        setReportConfigLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setHasReportConfig(false);
          setReportConfigLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, getAiReportConfig]);

  const activeSlice = useMemo(() => {
    if (scope === "global") {
      return instructions.global ?? { systemAppend: "", promptAppend: "" };
    }
    return instructions.byType?.[instructionType] ?? { systemAppend: "", promptAppend: "" };
  }, [scope, instructionType, instructions]);

  useEffect(() => {
    setSystemBlocks(markdownToInitialBlocks(activeSlice.systemAppend ?? ""));
    setPromptBlocks(markdownToInitialBlocks(activeSlice.promptAppend ?? ""));
    setEditorKey((k) => k + 1);
  }, [scope, instructionType, projectId, activeSlice.systemAppend, activeSlice.promptAppend]);

  const systemPreview = useMemo(() => blocksToMarkdown(systemBlocks), [systemBlocks]);
  const promptPreview = useMemo(() => blocksToMarkdown(promptBlocks), [promptBlocks]);
  const hasContent = hasMarkdownContent(systemPreview) || hasMarkdownContent(promptPreview);

  const canSave = useMemo(
    () => Boolean(projectId && hasReportConfig && hasContent),
    [projectId, hasReportConfig, hasContent]
  );

  const insertTemplate = useCallback(() => {
    setSystemBlocks(buildInstructionTemplateBlocks(copy.editorPlaceholder));
    setPromptBlocks([
      { type: "paragraph", text: "Focus on evidence from tasks and sprint dates in the context." },
    ]);
    setEditorKey((k) => k + 1);
  }, [copy.editorPlaceholder]);

  const save = async () => {
    if (!projectId) {
      toast.error(copy.pickProject);
      return;
    }
    if (!baseConfig || !hasReportConfig) {
      toast.error(copy.noReportConfig);
      return;
    }
    if (!hasContent) {
      toast.error(copy.contentRequired);
      return;
    }

    const nextInstructions: ReasoningInstructions = {
      ...instructions,
      global: { ...(instructions.global ?? { systemAppend: "", promptAppend: "" }) },
      byType: { ...(instructions.byType ?? {}) },
    };

    const slice = {
      systemAppend: blocksToMarkdown(systemBlocks),
      promptAppend: blocksToMarkdown(promptBlocks),
    };

    if (scope === "global") {
      nextInstructions.global = slice;
    } else {
      nextInstructions.byType = {
        ...nextInstructions.byType,
        [instructionType]: slice,
      };
    }

    setSaving(true);
    try {
      const ok = await updateAiReportConfig(projectId, {
        enabled: baseConfig.enabled,
        default_sprint_duration_days: baseConfig.default_sprint_duration_days,
        default_workable_days: baseConfig.default_workable_days,
        auto_create_next_sprint: baseConfig.auto_create_next_sprint,
        enable_sprint_kickoff: baseConfig.enable_sprint_kickoff,
        enable_daily_standup: baseConfig.enable_daily_standup,
        enable_sprint_review: baseConfig.enable_sprint_review,
        report_time_utc: baseConfig.report_time_utc,
        channels: baseConfig.channels,
        recipient_scope: baseConfig.recipient_scope,
        custom_recipients: baseConfig.custom_recipients,
        reasoning_instructions: nextInstructions,
      });

      if (!ok) {
        toast.error(copy.errorSave);
        return;
      }

      track("weave_engine_compose_instructions_save", { projectId, scope, instructionType });
      toast.success(copy.successSave);
      setInstructions(nextInstructions);
      router.push("/weave-engine");
    } catch (err: unknown) {
      toast.error(copy.errorSave, {
        description: err instanceof Error ? err.message : t.home.engine.unexpectedError,
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    projects,
    projectId,
    setProjectId: onProjectIdChange,
    reportConfigLoaded,
    hasReportConfig,
    scope,
    setScope,
    instructionType,
    setInstructionType,
    instructionTypes: INSTRUCTION_TYPES,
    systemBlocks,
    setSystemBlocks,
    promptBlocks,
    setPromptBlocks,
    editorKey,
    systemPreview,
    promptPreview,
    insertTemplate,
    canSave,
    saving,
    save,
    copy,
    engineTypes,
    noProjectsCopy: t.reasoningComposer.insight.noProjects,
    projectSettingsLink: projectId ? `/projects/${projectId}/details` : null,
  };
}
