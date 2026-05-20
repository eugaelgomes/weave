"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import { blocksToMarkdown, hasMarkdownContent } from "@/app/_utils/blocks-to-markdown";
import { markdownToInitialBlocks } from "@/app/_utils/markdown-to-initial-blocks";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import {
  emptyReasoningInstructions,
  parseReasoningInstructions,
  type ReasoningInstructions,
} from "@/app/_services/projects-service/reasoning-instructions.schema";
import { cn } from "@/lib/utils";
import {
  engineInsetNoticeClass,
  engineTextLinkClass,
} from "@/app/(protected)/home/_components/engine-styles";
import { getReasoningTypeLabel } from "@/app/(protected)/home/_components/engine-utils";
import { ComposeShell } from "@/app/(protected)/weave-engine/compose/_components/compose-shell";
import { MarkdownPreview } from "@/app/(protected)/weave-engine/compose/_components/markdown-preview";

const RichTextEditor = dynamic(
  () =>
    import("@/app/(protected)/_components/rich-editor/rich-editor").then((m) => m.RichTextEditor),
  {
    loading: () => (
      <div className="flex min-h-[160px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    ),
    ssr: false,
  }
);

const INSTRUCTION_TYPES = [
  "analysis",
  "daily_standup",
  "sprint_review",
  "sprint_kickoff",
  "deadline_alert",
] as const;

type InstructionScope = "global" | "byType";
type InstructionType = (typeof INSTRUCTION_TYPES)[number];

const TOTAL_STEPS = 4;

function buildBackHref(from: string | null, projectId: string | null): string {
  if (from === "project" && projectId) {
    return `/projects/${projectId}/details`;
  }
  return "/weave-engine/compose";
}

function buildInstructionTemplateBlocks(hint: string): CreateBlockData[] {
  return [
    { type: "paragraph", text: hint },
    { type: "list", text: "", properties: { attrs: { ordered: false } } },
  ];
}

export function InstructionsWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const copy = t.reasoningComposer.instructions;
  const engineTypes = t.home.engine.reasoningTypes;
  const { user } = useAuth();
  const { projects } = useWeaveEngine();
  const { getAiReportConfig, updateAiReportConfig } = useProjects();

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
  const [reportConfigLoaded, setReportConfigLoaded] = useState(false);
  const [hasReportConfig, setHasReportConfig] = useState(false);
  const [baseConfig, setBaseConfig] = useState<Awaited<ReturnType<typeof getAiReportConfig>>>(null);
  const [instructions, setInstructions] = useState<ReasoningInstructions>(emptyReasoningInstructions());
  const [scope, setScope] = useState<InstructionScope>("global");
  const [instructionType, setInstructionType] = useState<InstructionType>("analysis");
  const [systemBlocks, setSystemBlocks] = useState<CreateBlockData[]>([]);
  const [promptBlocks, setPromptBlocks] = useState<CreateBlockData[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const backHref = buildBackHref(from, projectId);

  useEffect(() => {
    if (!canManage) {
      toast.error(t.home.engine.forbidden);
      router.replace("/weave-engine");
    }
  }, [canManage, router, t.home.engine.forbidden]);

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

  const checklist = useMemo(
    () => [
      { id: "project", ok: Boolean(projectId && hasReportConfig) },
      { id: "scope", ok: Boolean(scope) },
      { id: "content", ok: hasContent },
    ],
    [projectId, hasReportConfig, scope, hasContent]
  );

  const allChecklistOk = checklist.every((c) => c.ok);

  const insertTemplate = useCallback(() => {
    setSystemBlocks(buildInstructionTemplateBlocks(copy.editorPlaceholder));
    setPromptBlocks([
      { type: "paragraph", text: "Focus on evidence from tasks and sprint dates in the context." },
    ]);
    setEditorKey((k) => k + 1);
  }, [copy.editorPlaceholder]);

  const validateStep = (current: number): boolean => {
    if (current === 1) {
      if (!projectId) {
        toast.error(copy.pickProject);
        return false;
      }
      if (!hasReportConfig) {
        toast.error(copy.noReportConfig);
        return false;
      }
    }
    if (current === 3 && !hasContent) {
      toast.error(copy.contentRequired);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const save = async () => {
    if (!projectId || !baseConfig || !validateStep(3) || !allChecklistOk) return;

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

  const sidebar = (
    <>
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
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
      {step >= 3 && (
        <div className="space-y-3">
          <div>
            <h3 className="mb-1 text-[10px] font-medium uppercase text-neutral-500">
              {copy.systemLabel}
            </h3>
            <MarkdownPreview markdown={systemPreview} emptyLabel={copy.previewEmpty} />
          </div>
          <div>
            <h3 className="mb-1 text-[10px] font-medium uppercase text-neutral-500">
              {copy.promptLabel}
            </h3>
            <MarkdownPreview markdown={promptPreview} emptyLabel={copy.previewEmpty} />
          </div>
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
          <p className={engineInsetNoticeClass}>{t.reasoningComposer.insight.noProjects}</p>
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
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-surface-dark-border"
                )}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
        {projectId && reportConfigLoaded && !hasReportConfig && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-amber-900 dark:text-amber-100">{copy.noReportConfig}</p>
            <Link
              href={`/projects/${projectId}/details`}
              className={cn(engineTextLinkClass, "mt-2 inline-block")}
            >
              {copy.openProjectSettings}
            </Link>
          </div>
        )}
      </div>
    );
  } else if (step === 2) {
    body = (
      <div className="space-y-4">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepScopeHint}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope("global")}
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              scope === "global"
                ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                : "border-neutral-200 dark:border-surface-dark-border"
            )}
          >
            {copy.scopeGlobal}
          </button>
          <button
            type="button"
            onClick={() => setScope("byType")}
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              scope === "byType"
                ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                : "border-neutral-200 dark:border-surface-dark-border"
            )}
          >
            {copy.scopeByType}
          </button>
        </div>
        {scope === "byType" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {INSTRUCTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setInstructionType(type)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-[12px]",
                  instructionType === type
                    ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                    : "border-neutral-200 dark:border-surface-dark-border"
                )}
              >
                <span className="font-medium">{getReasoningTypeLabel(type, engineTypes)}</span>
                <span className="mt-0.5 block text-[10px] text-neutral-500">
                  {copy.typeDescriptions[type as keyof typeof copy.typeDescriptions] ?? type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } else if (step === 3) {
    body = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepContentHint}</p>
          <button type="button" onClick={insertTemplate} className={engineTextLinkClass}>
            {copy.insertTemplate}
          </button>
        </div>
        <div>
          <h3 className="mb-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            {copy.systemLabel}
          </h3>
          <RichTextEditor
            key={`sys-${editorKey}`}
            initialBlocks={systemBlocks}
            editable
            onChange={setSystemBlocks}
            autosave={false}
            showSaveStatus={false}
          />
        </div>
        <div>
          <h3 className="mb-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            {copy.promptLabel}
          </h3>
          <RichTextEditor
            key={`prm-${editorKey}`}
            initialBlocks={promptBlocks}
            editable
            placeholder={copy.editorPlaceholder}
            onChange={setPromptBlocks}
            autosave={false}
            showSaveStatus={false}
          />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{copy.stepReviewHint}</p>
        <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">{copy.reviewProject}</dt>
            <dd>{projects.find((p) => p.id === projectId)?.title ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{copy.reviewScope}</dt>
            <dd>{scope === "global" ? copy.scopeGlobal : copy.scopeByType}</dd>
          </div>
          {scope === "byType" && (
            <div>
              <dt className="text-neutral-500">{copy.reviewType}</dt>
              <dd>{getReasoningTypeLabel(instructionType, engineTypes)}</dd>
            </div>
          )}
        </dl>
        <MarkdownPreview
          markdown={`### ${copy.systemLabel}\n\n${systemPreview}\n\n### ${copy.promptLabel}\n\n${promptPreview}`}
          emptyLabel={copy.previewEmpty}
        />
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
          ? {
              label: copy.next,
              onClick: goNext,
              disabled: step === 1 && (!reportConfigLoaded || !hasReportConfig),
            }
          : {
              label: copy.save,
              onClick: () => void save(),
              disabled: !allChecklistOk,
              loading: saving,
            }
      }
      secondaryAction={
        step > 1
          ? { label: copy.previous, onClick: goBack }
          : { label: copy.cancel, onClick: () => router.push(backHref) }
      }
    >
      {body}
    </ComposeShell>
  );
}
