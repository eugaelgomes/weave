"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import {
  engineFormControlClass,
  engineInsetNoticeClass,
  engineSubmitButtonClass,
  engineTextLinkClass,
} from "@/app/(protected)/weave-engine/_components/engine-styles";
import { getReasoningTypeLabel } from "@/app/(protected)/home/_components/engine-utils";
import { MarkdownPreview } from "@/app/(protected)/weave-engine/compose/_components/markdown-preview";
import { useInsightDraft } from "@/app/(protected)/weave-engine/compose/_hooks/use-insight-draft";
import { useInstructionsDraft } from "@/app/(protected)/weave-engine/compose/_hooks/use-instructions-draft";
import type { ComposeIntent } from "@/app/(protected)/weave-engine/compose/_utils/compose-utils";

const RichTextEditor = dynamic(
  () =>
    import("@/app/(protected)/_components/rich-editor/rich-editor").then((m) => m.RichTextEditor),
  {
    loading: () => (
      <div className="flex min-h-[120px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    ),
    ssr: false,
  }
);

export type ComposeWorkspaceProps = {
  intent: ComposeIntent;
  projectId: string | null;
  onProjectIdChange: (id: string) => void;
};

function ProjectPicker({
  projects,
  projectId,
  onSelect,
  emptyLabel,
}: {
  projects: { id: string; title: string }[];
  projectId: string | null;
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  if (projects.length === 0) {
    return <p className={engineInsetNoticeClass}>{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors",
            projectId === p.id
              ? "border-neutral-800 bg-neutral-900 text-white dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-900"
              : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-surface-dark-border dark:text-neutral-400 dark:hover:bg-neutral-900/50"
          )}
        >
          {p.title}
        </button>
      ))}
    </div>
  );
}

function InsightWorkspace({
  projectId,
  onProjectIdChange,
}: {
  projectId: string | null;
  onProjectIdChange: (id: string) => void;
}) {
  const draft = useInsightDraft(projectId, onProjectIdChange);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.projectHint}</p>
        <ProjectPicker
          projects={draft.projects}
          projectId={draft.projectId}
          onSelect={draft.setProjectId}
          emptyLabel={draft.copy.noProjects}
        />
        {draft.projectId && draft.checkingSprint ? (
          <p className="mt-2 text-[11px] text-neutral-500">{draft.copy.checkingSprint}</p>
        ) : null}
        {draft.projectId && draft.sprintOk === false && !draft.checkingSprint ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {draft.copy.noActiveSprint}
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.typeHint}</p>
        <div className="flex flex-wrap gap-1.5">
          {draft.typeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => draft.setReasoningType(type)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors",
                draft.reasoningType === type
                  ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                  : "border-neutral-200 dark:border-surface-dark-border"
              )}
            >
              {getReasoningTypeLabel(type, draft.engineTypes)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.titleHint}</p>
        <input
          value={draft.title}
          onChange={(e) => draft.setTitle(e.target.value)}
          className={engineFormControlClass}
          placeholder={draft.copy.titlePlaceholder}
        />
        <div className="mt-1.5 flex flex-wrap gap-2">
          {draft.titleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => draft.setTitle(suggestion)}
              className={engineTextLinkClass}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.contentHint}</p>
          <div className="flex gap-2">
            <button type="button" onClick={draft.insertTemplate} className={engineTextLinkClass}>
              {draft.copy.insertTemplate}
            </button>
            <button
              type="button"
              onClick={() => draft.setShowPreview((v) => !v)}
              className={engineTextLinkClass}
            >
              {draft.copy.previewToggle}
            </button>
          </div>
        </div>
        {draft.showPreview ? (
          <MarkdownPreview markdown={draft.previewMarkdown} emptyLabel={draft.copy.previewEmpty} />
        ) : (
          <RichTextEditor
            key={draft.editorKey}
            initialBlocks={draft.editorBlocks}
            editable
            placeholder={draft.copy.editorPlaceholder}
            onChange={draft.setEditorBlocks}
            autosave={false}
            showSaveStatus={false}
            className="min-h-[50vh]"
          />
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-neutral-100 bg-white py-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <button
          type="button"
          onClick={() => void draft.publish()}
          disabled={!draft.canPublish || draft.publishing}
          className={cn(engineSubmitButtonClass, "w-full sm:w-auto")}
        >
          {draft.publishing ? "…" : draft.copy.publish}
        </button>
      </footer>
    </div>
  );
}

function InstructionsWorkspace({
  projectId,
  onProjectIdChange,
}: {
  projectId: string | null;
  onProjectIdChange: (id: string) => void;
}) {
  const draft = useInstructionsDraft(projectId, onProjectIdChange);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.projectHint}</p>
        <ProjectPicker
          projects={draft.projects}
          projectId={draft.projectId}
          onSelect={draft.setProjectId}
          emptyLabel={draft.noProjectsCopy}
        />
        {draft.projectId && draft.reportConfigLoaded && !draft.hasReportConfig ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-amber-900 dark:text-amber-100">{draft.copy.noReportConfig}</p>
            {draft.projectSettingsLink ? (
              <Link href={draft.projectSettingsLink} className={cn(engineTextLinkClass, "mt-2 inline-block")}>
                {draft.copy.openProjectSettings}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.scopeHint}</p>
        <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">{draft.copy.scopeHintDetail}</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => draft.setScope("global")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-normal",
              draft.scope === "global"
                ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                : "border-neutral-200 dark:border-surface-dark-border"
            )}
          >
            {draft.copy.scopeGlobal}
          </button>
          <button
            type="button"
            onClick={() => draft.setScope("byType")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-normal",
              draft.scope === "byType"
                ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                : "border-neutral-200 dark:border-surface-dark-border"
            )}
          >
            {draft.copy.scopeByType}
          </button>
        </div>
        {draft.scope === "byType" ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.instructionTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => draft.setInstructionType(type)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-normal",
                  draft.instructionType === type
                    ? "border-neutral-800 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900"
                    : "border-neutral-200 dark:border-surface-dark-border"
                )}
              >
                {getReasoningTypeLabel(type, draft.engineTypes)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">{draft.copy.contentHint}</p>
          <button type="button" onClick={draft.insertTemplate} className={engineTextLinkClass}>
            {draft.copy.insertTemplate}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-1.5 text-[11px] font-normal text-neutral-600 dark:text-neutral-400">
              {draft.copy.systemLabel}
            </h3>
            <RichTextEditor
              key={`sys-${draft.editorKey}`}
              initialBlocks={draft.systemBlocks}
              editable
              onChange={draft.setSystemBlocks}
              autosave={false}
              showSaveStatus={false}
            />
          </div>
          <div>
            <h3 className="mb-1.5 text-[11px] font-normal text-neutral-600 dark:text-neutral-400">
              {draft.copy.promptLabel}
            </h3>
            <RichTextEditor
              key={`prm-${draft.editorKey}`}
              initialBlocks={draft.promptBlocks}
              editable
              placeholder={draft.copy.editorPlaceholder}
              onChange={draft.setPromptBlocks}
              autosave={false}
              showSaveStatus={false}
            />
          </div>
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-neutral-100 bg-white py-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <button
          type="button"
          onClick={() => void draft.save()}
          disabled={!draft.canSave || draft.saving}
          className={cn(engineSubmitButtonClass, "w-full sm:w-auto")}
        >
          {draft.saving ? "…" : draft.copy.save}
        </button>
      </footer>
    </div>
  );
}

export function ComposeWorkspace({ intent, projectId, onProjectIdChange }: ComposeWorkspaceProps) {
  const { t } = useLanguage();
  if (!intent) return null;

  const label =
    intent === "insight"
      ? t.reasoningComposer.insight.workspaceLabel
      : t.reasoningComposer.instructions.workspaceLabel;

  return (
    <section className="mx-auto w-full max-w-2xl border-t border-neutral-100 pt-6 dark:border-surface-dark-border">
      <h2 className="mb-4 text-[11px] font-normal uppercase tracking-wide text-neutral-400">{label}</h2>
      {intent === "insight" ? (
        <InsightWorkspace projectId={projectId} onProjectIdChange={onProjectIdChange} />
      ) : (
        <InstructionsWorkspace projectId={projectId} onProjectIdChange={onProjectIdChange} />
      )}
    </section>
  );
}
