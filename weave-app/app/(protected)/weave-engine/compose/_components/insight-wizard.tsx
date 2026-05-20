"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/app/_contexts/auth-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import { blocksToMarkdown, hasMarkdownContent } from "@/app/_utils/blocks-to-markdown";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { fetchActiveSprint } from "@/app/_services/projects-service/projects-service";
import { ApiError } from "@/app/_services/api-error";
import { cn } from "@/lib/utils";
import {
  engineFormControlClass,
  engineInsetNoticeClass,
  engineSubmitButtonClass,
  engineTextLinkClass,
} from "@/app/(protected)/home/_components/engine-styles";
import { getReasoningTypeLabel, interpolate } from "@/app/(protected)/home/_components/engine-utils";
import { ComposeShell } from "@/app/(protected)/weave-engine/compose/_components/compose-shell";
import { MarkdownPreview } from "@/app/(protected)/weave-engine/compose/_components/markdown-preview";
import {
  buildInsightTemplateBlocks,
  INSIGHT_TYPE_OPTIONS,
  type InsightTypeOption,
} from "@/app/(protected)/weave-engine/compose/_components/insight-templates";

const RichTextEditor = dynamic(
  () =>
    import("@/app/(protected)/_components/rich-editor/rich-editor").then((m) => m.RichTextEditor),
  {
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    ),
    ssr: false,
  }
);

const TOTAL_STEPS = 5;

function buildBackHref(from: string | null, projectId: string | null): string {
  if (from === "project" && projectId) {
    return `/projects/${projectId}/details`;
  }
  return "/weave-engine";
}

export function InsightWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const copy = t.reasoningComposer.insight;
  const engineTypes = t.home.engine.reasoningTypes;
  const { user } = useAuth();
  const { projects, createReasoningFromMarkdown } = useWeaveEngine();

  const initialProjectId = searchParams.get("projectId");
  const from = searchParams.get("from");

  const canManage = useMemo(() => {
    const role =
      typeof user?.org_member_role === "string"
        ? user.org_member_role
        : Array.isArray(user?.org_member_role)
          ? user?.org_member_role?.[0]
          : null;
    return orgRoleHasPermission(role, ORG_PERMISSIONS.MANAGE_PROJECTS);
  }, [user?.org_member_role]);

  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [sprintOk, setSprintOk] = useState<boolean | null>(null);
  const [checkingSprint, setCheckingSprint] = useState(false);
  const [reasoningType, setReasoningType] = useState<InsightTypeOption>("analysis");
  const [title, setTitle] = useState("");
  const [editorBlocks, setEditorBlocks] = useState<CreateBlockData[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const backHref = buildBackHref(from, projectId);

  useEffect(() => {
    if (!canManage) {
      toast.error(t.home.engine.forbidden);
      router.replace("/weave-engine");
    }
  }, [canManage, router, t.home.engine.forbidden]);

  if (!canManage) {
    return null;
  }

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

  const checklist = useMemo(() => {
    const items = [
      { id: "project", ok: Boolean(projectId && sprintOk) },
      { id: "type", ok: Boolean(reasoningType) },
      { id: "title", ok: title.trim().length > 0 },
      { id: "body", ok: hasMarkdownContent(previewMarkdown) },
    ];
    return items;
  }, [projectId, sprintOk, reasoningType, title, previewMarkdown]);

  const allChecklistOk = checklist.every((c) => c.ok);

  const insertTemplate = useCallback(() => {
    const blocks = buildInsightTemplateBlocks({
      summary: copy.templateSummary,
      risks: copy.templateRisks,
      actions: copy.templateActions,
    });
    setEditorBlocks(blocks);
    setEditorKey((k) => k + 1);
  }, [copy]);

  const validateStep = (current: number): boolean => {
    if (current === 1) {
      if (!projectId) {
        toast.error(copy.pickProject);
        return false;
      }
      if (sprintOk === false) {
        toast.error(copy.noActiveSprint);
        return false;
      }
      if (checkingSprint) return false;
    }
    if (current === 2 && !reasoningType) {
      toast.error(copy.pickType);
      return false;
    }
    if (current === 3 && !title.trim()) {
      toast.error(copy.titleRequired);
      return false;
    }
    if (current === 4 && !hasMarkdownContent(previewMarkdown)) {
      toast.error(copy.bodyRequired);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const publish = async () => {
    if (!projectId || !validateStep(4) || !allChecklistOk) return;

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
      track("weave_engine_compose_insight_publish", {
        projectId,
        reasoningType,
      });
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

  const sidebar = (
    <>
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {copy.sidebarGuide}
        </h2>
        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{copy.sidebarHint}</p>
      </div>
      <ul className="space-y-1.5 text-[11px]">
        {checklist.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-2",
              item.ok ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"
            )}
          >
            <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
            {copy.checklist[item.id as keyof typeof copy.checklist]}
          </li>
        ))}
      </ul>
      {step >= 4 && (
        <div>
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            {copy.previewTitle}
          </h3>
          <MarkdownPreview markdown={previewMarkdown} emptyLabel={copy.previewEmpty} />
        </div>
      )}
    </>
  );

  let body: React.ReactNode = null;

  if (step === 1) {
    body = (
      <div className="space-y-3">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepProjectHint}</p>
        {projects.length === 0 ? (
          <p className={engineInsetNoticeClass}>{copy.noProjects}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-[12px] transition-colors",
                  projectId === p.id
                    ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-surface-dark-border dark:hover:bg-neutral-900/40"
                )}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.title}</span>
              </button>
            ))}
          </div>
        )}
        {projectId && checkingSprint && (
          <p className="text-[11px] text-neutral-500">{copy.checkingSprint}</p>
        )}
        {projectId && sprintOk === false && !checkingSprint && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {copy.noActiveSprint}
          </p>
        )}
      </div>
    );
  } else if (step === 2) {
    body = (
      <div className="space-y-3">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepTypeHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {INSIGHT_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setReasoningType(type)}
              className={cn(
                "rounded-md border px-3 py-2 text-left transition-colors",
                reasoningType === type
                  ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-surface-dark-border"
              )}
            >
              <span className="text-[12px] font-medium text-neutral-900 dark:text-neutral-100">
                {getReasoningTypeLabel(type, engineTypes)}
              </span>
              <span className="mt-0.5 block text-[10px] text-neutral-500">
                {copy.typeDescriptions[type as keyof typeof copy.typeDescriptions] ?? type}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else if (step === 3) {
    body = (
      <div className="space-y-3">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepTitleHint}</p>
        <label className="block">
          <span className="text-[11px] text-neutral-500">{copy.titleLabel}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={engineFormControlClass}
            placeholder={copy.titlePlaceholder}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {titleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTitle(suggestion)}
              className={engineTextLinkClass}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (step === 4) {
    body = (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepContentHint}</p>
          <button type="button" onClick={insertTemplate} className={engineTextLinkClass}>
            {copy.insertTemplate}
          </button>
        </div>
        <RichTextEditor
          key={editorKey}
          initialBlocks={editorBlocks}
          editable
          placeholder={copy.editorPlaceholder}
          onChange={setEditorBlocks}
          autosave={false}
          showSaveStatus={false}
          className="min-h-[280px]"
        />
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepReviewHint}</p>
        <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">{copy.reviewProject}</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">
              {projects.find((p) => p.id === projectId)?.title ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{copy.reviewType}</dt>
            <dd>{getReasoningTypeLabel(reasoningType, engineTypes)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">{copy.reviewTitle}</dt>
            <dd>{title}</dd>
          </div>
        </dl>
        <MarkdownPreview markdown={previewMarkdown} emptyLabel={copy.previewEmpty} />
      </div>
    );
  }

  return (
    <ComposeShell
      title={copy.title}
      subtitle={copy.subtitle}
      backHref={backHref}
      backLabel={copy.back}
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabel={copy.stepLabel}
      sidebar={sidebar}
      primaryAction={
        step < TOTAL_STEPS
          ? { label: copy.next, onClick: goNext, disabled: step === 1 && checkingSprint }
          : {
              label: copy.publish,
              onClick: () => void publish(),
              disabled: !allChecklistOk,
              loading: publishing,
            }
      }
      secondaryAction={
        step > 1 ? { label: copy.previous, onClick: goBack } : { label: copy.cancel, onClick: () => router.push(backHref) }
      }
    >
      {body}
    </ComposeShell>
  );
}
