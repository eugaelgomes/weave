"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { ApplicationPageNav } from "@/app/(protected)/_components/ui/ApplicationPageNav";
import { useAuth } from "@/app/_contexts/auth-context";
import type { AiReportConfigUpsertPayload } from "@/app/_contexts/projects-context";
import {
  CREATE_PROJECT_WIZARD_STEPS,
  type BasicDraft,
  type CreateProjectWizardActions,
  type CreateProjectWizardState,
  type CreateProjectWizardStep,
} from "@/app/(protected)/projects/new/_components/create-project-wizard.types";
import { BasicStep } from "@/app/(protected)/projects/new/_components/steps/BasicStep";
import { StagesStep } from "@/app/(protected)/projects/new/_components/steps/StagesStep";
import { CollaboratorsStep } from "@/app/(protected)/projects/new/_components/steps/CollaboratorsStep";
import { AiReportsStep } from "@/app/(protected)/projects/new/_components/steps/AiReportsStep";
import { ReviewStep } from "@/app/(protected)/projects/new/_components/steps/ReviewStep";

const DEFAULT_BASIC: BasicDraft = {
  title: "",
  description: "",
  methodology: "kanban",
  color: "#eab308",
};

const DEFAULT_REPORT_FORM: AiReportConfigUpsertPayload = {
  enabled: true,
  report_time_utc: "09:00",
  channels: ["in_app"],
  recipient_scope: "all_members",
  default_sprint_duration_days: 14,
  default_workable_days: [1, 2, 3, 4, 5],
  auto_create_next_sprint: false,
  enable_sprint_kickoff: true,
  enable_daily_standup: false,
  enable_sprint_review: true,
};

function stepLabel(step: CreateProjectWizardStep): string {
  switch (step) {
    case "basic":
      return "Básico";
    case "stages":
      return "Etapas";
    case "collaborators":
      return "Pessoas";
    case "ai_reports":
      return "Relatórios";
    case "review":
      return "Revisão";
  }
}

function clampStepIndex(i: number): number {
  return Math.max(0, Math.min(i, CREATE_PROJECT_WIZARD_STEPS.length - 1));
}

type PersistedWizardStateV1 = {
  v: 1;
  activeStep: CreateProjectWizardStep;
  created: { projectId: string | null };
  draft: Omit<CreateProjectWizardState["draft"], "iconFile"> & { iconFile: null };
  setup: CreateProjectWizardState["setup"];
};

function storageKey(userId: string): string {
  return `create_project_wizard:v1:${userId}`;
}

export function CreateProjectWizard() {
  const router = useRouter();
  const params = useParams();

  const { user } = useAuth();

  const [state, setState] = useState<CreateProjectWizardState>(() => ({
    activeStep: "basic",
    created: { projectId: null, project: null },
    draft: {
      basic: DEFAULT_BASIC,
      iconFile: null,
      customizeStages: false,
      stageDrafts: [],
      collaborators: [],
      configureReports: false,
      reportForm: DEFAULT_REPORT_FORM,
    },
    setup: {
      statusByStep: {
        icon: "idle",
        stages: "idle",
        collaborators: "idle",
        ai_reports: "idle",
      },
      errorByStep: {},
    },
  }));

  // Restore draft from sessionStorage (best-effort). Note: icon file cannot be restored.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const raw = sessionStorage.getItem(storageKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedWizardStateV1;
      if (!parsed || parsed.v !== 1) return;
      setState((prev) => ({
        ...prev,
        activeStep: parsed.activeStep,
        created: { projectId: parsed.created.projectId, project: null },
        draft: { ...parsed.draft, iconFile: null },
        setup: parsed.setup,
      }));
    } catch {
      // ignore corrupted storage
    }
  }, [user?.id]);

  // Persist draft to sessionStorage (best-effort). Note: icon file cannot be stored.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const payload: PersistedWizardStateV1 = {
      v: 1,
      activeStep: state.activeStep,
      created: { projectId: state.created.projectId },
      draft: { ...state.draft, iconFile: null },
      setup: state.setup,
    };
    try {
      sessionStorage.setItem(storageKey(userId), JSON.stringify(payload));
    } catch {
      // ignore quota / private mode errors
    }
  }, [state.activeStep, state.created.projectId, state.draft, state.setup, user?.id]);

  const stepIndex = useMemo(
    () => CREATE_PROJECT_WIZARD_STEPS.indexOf(state.activeStep),
    [state.activeStep]
  );

  const actions: CreateProjectWizardActions = useMemo(
    () => ({
      goToStep: (step) => setState((prev) => ({ ...prev, activeStep: step })),
      next: () =>
        setState((prev) => {
          const i = clampStepIndex(CREATE_PROJECT_WIZARD_STEPS.indexOf(prev.activeStep) + 1);
          return { ...prev, activeStep: CREATE_PROJECT_WIZARD_STEPS[i] };
        }),
      back: () =>
        setState((prev) => {
          const i = clampStepIndex(CREATE_PROJECT_WIZARD_STEPS.indexOf(prev.activeStep) - 1);
          return { ...prev, activeStep: CREATE_PROJECT_WIZARD_STEPS[i] };
        }),
      setBasicDraft: (key, value) =>
        setState((prev) => ({
          ...prev,
          draft: { ...prev.draft, basic: { ...prev.draft.basic, [key]: value } },
        })),
      setIconFile: (file) =>
        setState((prev) => ({ ...prev, draft: { ...prev.draft, iconFile: file } })),
      setCustomizeStages: (on) =>
        setState((prev) => ({ ...prev, draft: { ...prev.draft, customizeStages: on } })),
      setStageDrafts: (rows) =>
        setState((prev) => ({
          ...prev,
          draft: {
            ...prev.draft,
            stageDrafts: typeof rows === "function" ? rows(prev.draft.stageDrafts) : rows,
          },
        })),
      addCollaboratorDraft: (user, role) =>
        setState((prev) => {
          if (prev.draft.collaborators.some((c) => c.user.id === user.id)) return prev;
          return {
            ...prev,
            draft: {
              ...prev.draft,
              collaborators: [...prev.draft.collaborators, { user, role }],
            },
          };
        }),
      removeCollaboratorDraft: (userId) =>
        setState((prev) => ({
          ...prev,
          draft: {
            ...prev.draft,
            collaborators: prev.draft.collaborators.filter((c) => c.user.id !== userId),
          },
        })),
      setConfigureReports: (on) =>
        setState((prev) => ({ ...prev, draft: { ...prev.draft, configureReports: on } })),
      setReportForm: (patch) =>
        setState((prev) => ({
          ...prev,
          draft: {
            ...prev.draft,
            reportForm:
              typeof patch === "function"
                ? patch(prev.draft.reportForm)
                : { ...prev.draft.reportForm, ...patch },
          },
        })),
      setCreatedProject: (project) =>
        setState((prev) => ({
          ...prev,
          created: { projectId: project.id, project },
        })),
      setSetupStatus: (step, status, err) =>
        setState((prev) => ({
          ...prev,
          setup: {
            statusByStep: { ...prev.setup.statusByStep, [step]: status },
            errorByStep: { ...prev.setup.errorByStep, [step]: err },
          },
        })),
      resetAll: () => {
        const userId = user?.id;
        if (userId) {
          try {
            sessionStorage.removeItem(storageKey(userId));
          } catch {
            // ignore
          }
        }
        setState({
          activeStep: "basic",
          created: { projectId: null, project: null },
          draft: {
            basic: DEFAULT_BASIC,
            iconFile: null,
            customizeStages: false,
            stageDrafts: [],
            collaborators: [],
            configureReports: false,
            reportForm: DEFAULT_REPORT_FORM,
          },
          setup: {
            statusByStep: {
              icon: "idle",
              stages: "idle",
              collaborators: "idle",
              ai_reports: "idle",
            },
            errorByStep: {},
          },
        });
      },
    }),
    [user?.id]
  );

  const canNavigateToStep = useCallback(
    (target: CreateProjectWizardStep): boolean => {
      if (target === "basic") return true;
      return Boolean(state.created.projectId);
    },
    [state.created.projectId]
  );

  const onClickStep = useCallback(
    (target: CreateProjectWizardStep) => {
      if (!canNavigateToStep(target)) return;
      actions.goToStep(target);
    },
    [actions, canNavigateToStep]
  );

  useEffect(() => {
    // If user somehow lands on later steps without a created project, enforce basic.
    if (state.activeStep !== "basic" && !state.created.projectId) {
      actions.goToStep("basic");
    }
  }, [actions, state.activeStep, state.created.projectId]);

  const showOpenProject = Boolean(state.created.projectId);

  return (
    <>
      <div className="w-full">
        <ApplicationPageNav
          aria-label="Novo projeto"
          leftContent={
            <button
              type="button"
              onClick={() => router.push(`/projects`)}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-100"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Voltar
            </button>
          }
          rightContent={
            showOpenProject ? (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/projects/${state.created.project?.public_id || state.created.projectId}`
                  )
                }
                className="bg-brand-primary-500 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-neutral-950 transition hover:brightness-95"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Abrir projeto agora
              </button>
            ) : null
          }
        />
      </div>

      <div className="w-full p-2">
        <div className="mb-3">
          <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Novo projeto
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Crie o projeto e (se quiser) configure etapas, convide pessoas e ative relatórios — por
            etapas.
          </p>
        </div>

        <div className="dark:border-surface-dark-border mb-3 rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
          <nav aria-label="Etapas" className="flex flex-wrap gap-1.5">
            {CREATE_PROJECT_WIZARD_STEPS.map((s, i) => {
              const active = state.activeStep === s;
              const enabled = canNavigateToStep(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onClickStep(s)}
                  aria-current={active ? "step" : undefined}
                  disabled={!enabled}
                  className={[
                    "rounded-md px-2 py-1.5 text-xs font-semibold transition",
                    active
                      ? "bg-brand-primary-500 text-neutral-950"
                      : enabled
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        : "bg-neutral-50 text-neutral-300 dark:bg-[#1d1d1b] dark:text-neutral-600",
                  ].join(" ")}
                >
                  {i + 1}. {stepLabel(s)}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2">
          {state.activeStep === "basic" && <BasicStep state={state} actions={actions} />}
          {state.activeStep === "stages" && <StagesStep state={state} actions={actions} />}
          {state.activeStep === "collaborators" && (
            <CollaboratorsStep state={state} actions={actions} />
          )}
          {state.activeStep === "ai_reports" && <AiReportsStep state={state} actions={actions} />}
          {state.activeStep === "review" && <ReviewStep state={state} actions={actions} />}
        </div>

        <div className="dark:border-surface-dark-border mt-3 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2">
          <button
            type="button"
            onClick={actions.back}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Voltar
          </button>
          <button
            type="button"
            onClick={actions.next}
            disabled={
              stepIndex === CREATE_PROJECT_WIZARD_STEPS.length - 1 ||
              (state.activeStep === "basic" && !state.created.projectId) ||
              (!state.created.projectId && state.activeStep !== "basic")
            }
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-2 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            Próximo
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
