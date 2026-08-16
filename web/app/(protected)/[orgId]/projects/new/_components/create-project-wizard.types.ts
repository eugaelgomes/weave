import type {
  AiReportConfigUpsertPayload,
  CreateProjectData,
  Project,
  ProjectStage,
} from "@/app/_contexts/projects-context";
import type { SearchUser } from "@/app/_contexts/notes-context";

export const CREATE_PROJECT_WIZARD_STEPS = [
  "basic",
  "stages",
  "collaborators",
  "ai_reports",
  "review",
] as const;

export type CreateProjectWizardStep = (typeof CREATE_PROJECT_WIZARD_STEPS)[number];

export type BasicDraft = {
  title: string;
  description: string;
  methodology: NonNullable<CreateProjectData["methodology"]>;
  color: string;
};

export type StageDraft = { name: string; color: string };

export type PendingCollaborator = {
  user: SearchUser;
  role: string;
};

export type SetupStepKey = "icon" | "stages" | "collaborators" | "ai_reports";
export type SetupStatus = "idle" | "running" | "done" | "error";

export type SetupProgress = {
  statusByStep: Record<SetupStepKey, SetupStatus>;
  errorByStep: Partial<Record<SetupStepKey, string>>;
};

export type CreateProjectWizardState = {
  activeStep: CreateProjectWizardStep;
  created: {
    projectId: string | null;
    project: Project | null;
  };
  draft: {
    basic: BasicDraft;
    iconFile: File | null;
    customizeStages: boolean;
    stageDrafts: StageDraft[];
    collaborators: PendingCollaborator[];
    configureReports: boolean;
    reportForm: AiReportConfigUpsertPayload;
  };
  setup: SetupProgress;
};

export type CreateProjectWizardActions = {
  goToStep: (step: CreateProjectWizardStep) => void;
  next: () => void;
  back: () => void;
  setBasicDraft: <K extends keyof BasicDraft>(key: K, value: BasicDraft[K]) => void;
  setIconFile: (file: File | null) => void;
  setCustomizeStages: (on: boolean) => void;
  setStageDrafts: (rows: StageDraft[] | ((prev: StageDraft[]) => StageDraft[])) => void;
  addCollaboratorDraft: (user: SearchUser, role: string) => void;
  removeCollaboratorDraft: (userId: string) => void;
  setConfigureReports: (on: boolean) => void;
  setReportForm: (
    patch:
      | Partial<AiReportConfigUpsertPayload>
      | ((prev: AiReportConfigUpsertPayload) => AiReportConfigUpsertPayload)
  ) => void;
  setCreatedProject: (project: Project) => void;
  setSetupStatus: (step: SetupStepKey, status: SetupStatus, err?: string) => void;
  resetAll: () => void;
};

export type CreateProjectWizardStepProps = {
  state: CreateProjectWizardState;
  actions: CreateProjectWizardActions;
  projectStages?: ProjectStage[] | null;
};
