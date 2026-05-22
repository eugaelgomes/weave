"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { toast } from "sonner";

import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { blocksToMarkdown, hasMarkdownContent } from "@/app/_utils/blocks-to-markdown";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { fetchActiveSprint } from "@/app/_services/projects-service/projects-service";
import { ApiError } from "@/app/_services/api-error";
import {
  getReasoningTypeLabel,
  interpolate,
} from "@/app/(protected)/home/_components/engine-utils";
import {
  buildInsightTemplateBlocks,
  INSIGHT_TYPE_OPTIONS,
  type InsightTypeOption,
} from "@/app/(protected)/weave-engine/compose/_components/insight-templates";

export function useInsightDraft(projectId: string | null, onProjectIdChange: (id: string) => void) {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.reasoningComposer.insight;
  const engineTypes = t.home.engine.reasoningTypes;
  const { projects, createReasoningFromMarkdown } = useWeaveEngine();

  const [sprintOk, setSprintOk] = useState<boolean | null>(null);
  const [checkingSprint, setCheckingSprint] = useState(false);
  const [reasoningType, setReasoningType] = useState<InsightTypeOption>("analysis");
  const [title, setTitle] = useState("");
  const [editorBlocks, setEditorBlocks] = useState<CreateBlockData[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setSprintOk(null);
      return;
    }
    let cancelled = false;
    setCheckingSprint(true);
    void fetchActiveSprint(projectId)
      .then((sprint) => {
        if (!cancelled) setSprintOk(Boolean(sprint?.id));
      })
      .catch(() => {
        if (!cancelled) setSprintOk(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingSprint(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const titleSuggestions = useMemo(() => {
    const label = getReasoningTypeLabel(reasoningType, engineTypes);
    const date = new Date().toISOString().slice(0, 10);
    return [
      interpolate(copy.titleSuggestion, { type: label, date }),
      interpolate(copy.titleSuggestionShort, { type: label }),
    ];
  }, [reasoningType, engineTypes, copy]);

  const previewMarkdown = useMemo(() => blocksToMarkdown(editorBlocks), [editorBlocks]);

  const canPublish = useMemo(
    () =>
      Boolean(
        projectId &&
          sprintOk &&
          !checkingSprint &&
          reasoningType &&
          title.trim().length > 0 &&
          hasMarkdownContent(previewMarkdown)
      ),
    [projectId, sprintOk, checkingSprint, reasoningType, title, previewMarkdown]
  );

  const insertTemplate = useCallback(() => {
    setEditorBlocks(
      buildInsightTemplateBlocks({
        summary: copy.templateSummary,
        risks: copy.templateRisks,
        actions: copy.templateActions,
      })
    );
    setEditorKey((k) => k + 1);
  }, [copy]);

  const publish = async () => {
    if (!projectId) {
      toast.error(copy.pickProject);
      return;
    }
    if (sprintOk === false) {
      toast.error(copy.noActiveSprint);
      return;
    }
    if (!title.trim()) {
      toast.error(copy.titleRequired);
      return;
    }
    const markdown = blocksToMarkdown(editorBlocks);
    if (!hasMarkdownContent(markdown)) {
      toast.error(copy.bodyRequired);
      return;
    }

    setPublishing(true);
    try {
      await createReasoningFromMarkdown(projectId, {
        reasoningType,
        title: title.trim(),
        outputMarkdown: markdown,
      });
      track("weave_engine_compose_insight_publish", { projectId, reasoningType });
      toast.success(copy.successPublish);
      router.push("/weave-engine");
    } catch (err: unknown) {
      const isForbidden = err instanceof ApiError && err.status === 403;
      toast.error(isForbidden ? t.home.engine.forbidden : copy.errorPublish, {
        description: err instanceof Error ? err.message : t.home.engine.unexpectedError,
      });
    } finally {
      setPublishing(false);
    }
  };

  return {
    projects,
    projectId,
    setProjectId: onProjectIdChange,
    sprintOk,
    checkingSprint,
    reasoningType,
    setReasoningType,
    title,
    setTitle,
    titleSuggestions,
    editorBlocks,
    setEditorBlocks,
    editorKey,
    previewMarkdown,
    showPreview,
    setShowPreview,
    insertTemplate,
    canPublish,
    publishing,
    publish,
    typeOptions: INSIGHT_TYPE_OPTIONS,
    copy,
    engineTypes,
  };
}
