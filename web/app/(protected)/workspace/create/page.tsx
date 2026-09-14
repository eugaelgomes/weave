"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Camera, CheckCircle2, Circle, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  completeWorkspaceCreationStepOne,
  fetchWorkspaceCreationStepOne,
  WorkspaceBusinessRole,
  saveWorkspaceCreationStepOne,
} from "@/app/_services/workspace";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import { useWorkspace } from "@/app/_contexts/workspace-context";
import getStorageUrl from "@/app/_utils/get-storage-url";

const ROLE_LABELS: Record<WorkspaceBusinessRole, string> = {
  TECHNOLOGY: "Technology",
  MARKETING: "Marketing",
  BUSINESS: "Business",
  FINANCE: "Finance",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  RETAIL: "Retail",
  INDUSTRY: "Industry",
  OTHER: "Other",
};

const FALLBACK_ROLE_OPTIONS: WorkspaceBusinessRole[] = [
  "TECHNOLOGY",
  "MARKETING",
  "BUSINESS",
  "FINANCE",
  "HEALTHCARE",
  "EDUCATION",
  "RETAIL",
  "INDUSTRY",
  "OTHER",
];

type StepOneForm = {
  workspace_name: string;
  unique_name: string;
  workspace_role: WorkspaceBusinessRole;
  description: string;
  default_locale: string;
  country: string;
  language: string;
};

const DEFAULT_FORM: StepOneForm = {
  workspace_name: "",
  unique_name: "",
  workspace_role: "TECHNOLOGY",
  description: "",
  default_locale: "en-US",
  country: "",
  language: "en",
};

const CREATION_STEPS = [
  {
    id: 1,
    key: "basic",
    label: "Basic",
    hint: "Name, unique name, role, locale and identity",
    optional: false,
  },
  {
    id: 2,
    key: "branding_properties",
    label: "Branding properties",
    hint: "Primary and secondary colors, visual identity",
    optional: true,
  },
  {
    id: 3,
    key: "users",
    label: "Users",
    hint: "Initial users and permissions",
    optional: true,
  },
  {
    id: 4,
    key: "integrations",
    label: "Integrations",
    hint: "Connect external services",
    optional: true,
  },
  {
    id: 5,
    key: "domains",
    label: "Domains",
    hint: "Custom domains and verification",
    optional: true,
  },
] as const;

const inputFieldClass =
  "w-full rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100 dark:focus:border-yellow-500/50";

export default function WorkspaceCreatePage() {
  const router = useRouter();
  const params = useParams();

  const { refreshWorkspace, uploadLogo, workspace } = useWorkspace();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<WorkspaceBusinessRole[]>(FALLBACK_ROLE_OPTIONS);
  const [form, setForm] = useState<StepOneForm>(DEFAULT_FORM);
  const [stepOneCompleted, setStepOneCompleted] = useState(false);

  const canComplete = useMemo(
    () =>
      Boolean(
        form.workspace_name.trim() &&
        form.unique_name.trim() &&
        form.workspace_role &&
        form.default_locale.trim() &&
        form.country.trim() &&
        form.language.trim()
      ),
    [form]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchWorkspaceCreationStepOne();
        const workspace = response.workspace;
        const availableRoles = (response.role_options || response.available_roles || []).filter(
          (role): role is WorkspaceBusinessRole => FALLBACK_ROLE_OPTIONS.includes(role)
        );
        const resolvedRoleOptions = availableRoles.length ? availableRoles : FALLBACK_ROLE_OPTIONS;

        setRoleOptions(resolvedRoleOptions);
        const completedSteps = workspace?.settings?.creation_steps?.completed_steps || [];
        setStepOneCompleted(Array.isArray(completedSteps) && completedSteps.includes("step_1"));
        if (workspace) {
          const roleFromSettings = workspace.settings?.workspace_role;
          const resolvedRole = FALLBACK_ROLE_OPTIONS.includes(roleFromSettings)
            ? roleFromSettings
            : resolvedRoleOptions[0];

          setForm((prev) => ({
            ...prev,
            workspace_name: workspace.workspace_name || "",
            unique_name: workspace.unique_name || "",
            description: workspace.description || "",
            workspace_role: resolvedRole || prev.workspace_role,
            default_locale: workspace.default_locale || prev.default_locale,
            country: workspace.country || "",
            language: workspace.settings?.language || prev.language,
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            workspace_role: resolvedRoleOptions[0] || prev.workspace_role,
          }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao carregar etapa de criação");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleLogoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!workspace?.id) {
      toast.error("Salve o passo 1 pelo menos uma vez para enviar o logo.");
      return;
    }
    setLogoUploading(true);
    try {
      const updated = await uploadLogo(file);
      if (updated) await refreshWorkspace();
      toast.success("Logo atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFieldChange =
    (field: keyof StepOneForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const nextValue = event.target.value;
      setForm((prev) => ({
        ...prev,
        [field]:
          field === "unique_name"
            ? nextValue.toLowerCase().replace(/\s+/g, "-")
            : field === "country"
              ? nextValue.toUpperCase()
              : field === "language"
                ? nextValue.toLowerCase()
                : nextValue,
      }));
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveWorkspaceCreationStepOne({
        workspace_name: form.workspace_name,
        unique_name: form.unique_name,
        workspace_role: form.workspace_role,
        description: form.description || undefined,
        default_locale: form.default_locale || null,
        country: form.country ? form.country.toUpperCase() : null,
        language: form.language || null,
      });
      await refreshWorkspace();
      toast.success("Etapa 1 salva");
      setStepOneCompleted(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar etapa 1");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) {
      toast.error("Preencha os campos obrigatórios antes de concluir.");
      return;
    }
    setCompleting(true);
    try {
      await completeWorkspaceCreationStepOne();
      await refreshWorkspace();
      toast.success("Etapa 1 concluida");
      setStepOneCompleted(true);
      router.push(
        workspace?.public_id
          ? `/workspace/${encodeURIComponent(workspace.public_id)}/general`
          : "/workspace"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao concluir etapa 1");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-neutral-50 dark:bg-[#1d1d1b]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex min-h-screen w-full flex-col gap-4 bg-neutral-50 px-4 pb-8 duration-200 dark:bg-[#1d1d1b]">
      <WorkspaceHeader />
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="dark:border-surface-dark-border dark:shadow-surface-dark-sm rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:bg-[#1d1d1b]">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
            <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
            Workspace creation steps
          </div>
          <div className="space-y-2">
            {CREATION_STEPS.map((step) => {
              const isCurrent = step.id === 1;
              const isDone = step.id < 1 || (step.id === 1 && stepOneCompleted);
              return (
                <div
                  key={step.key}
                  className={`rounded-md border p-3 ${
                    isCurrent
                      ? "border-brand-primary-500 bg-brand-primary-500 dark:border-brand-primary-500 dark:bg-brand-primary-500 text-white"
                      : "dark:border-surface-dark-border border-neutral-200 bg-neutral-50 text-neutral-700 dark:bg-[#1d1d1b] dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold">
                      {step.id}. {step.label}
                    </p>
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 opacity-70" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] opacity-80">{step.hint}</p>
                  <p className="mt-1 text-[10px] font-medium opacity-75">
                    {isCurrent ? "Current" : step.optional ? "Optional" : "Required"}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:bg-[#1d1d1b]">
          <div className="dark:border-surface-dark-border mb-4 border-b border-neutral-200 pb-3">
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Step 1 - Basic information
            </h1>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Required: name, unique name, role, locale, country and language.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleSave}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Workspace name
                </label>
                <input
                  className={inputFieldClass}
                  placeholder="Acme Inc."
                  value={form.workspace_name}
                  onChange={handleFieldChange("workspace_name")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Unique name
                </label>
                <input
                  className={inputFieldClass}
                  placeholder="acme-inc"
                  value={form.unique_name}
                  onChange={handleFieldChange("unique_name")}
                  required
                />
              </div>
            </div>

            <div className="dark:border-surface-dark-border flex flex-wrap items-start gap-3 rounded-md border border-neutral-200 p-3">
              <div className="dark:border-surface-dark-border relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:bg-[#1d1d1b]">
                {workspace?.logo_url ? (
                  <img
                    src={getStorageUrl(workspace.logo_url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Logo (opcional)
                </span>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="sr-only"
                  onChange={handleLogoFile}
                  disabled={logoUploading}
                />
                <button
                  type="button"
                  disabled={logoUploading || !workspace?.id}
                  onClick={() => logoInputRef.current?.click()}
                  className="dark:border-surface-dark-border-strong inline-flex w-fit items-center gap-1 rounded-md border border-neutral-300 px-2 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {logoUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {logoUploading ? "Enviando..." : "Escolher imagem"}
                </button>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  PNG, JPG ou WebP. Depois de salvar o passo 1 uma vez, o upload fica disponível.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Workspace role
              </label>
              <select
                aria-label="Workspace role"
                className={inputFieldClass}
                value={form.workspace_role}
                onChange={handleFieldChange("workspace_role")}
                required
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role] || role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Description (optional)
              </label>
              <textarea
                className={inputFieldClass}
                placeholder="What does your workspace focus on?"
                rows={3}
                value={form.description}
                onChange={handleFieldChange("description")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Locale
                </label>
                <input
                  className={inputFieldClass}
                  placeholder="en-US"
                  value={form.default_locale}
                  onChange={handleFieldChange("default_locale")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Country
                </label>
                <input
                  maxLength={2}
                  className={`${inputFieldClass} uppercase`}
                  placeholder="BR"
                  value={form.country}
                  onChange={handleFieldChange("country")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Language
                </label>
                <input
                  className={`${inputFieldClass} lowercase`}
                  placeholder="en"
                  value={form.language}
                  onChange={handleFieldChange("language")}
                  required
                />
              </div>
            </div>

            <div className="dark:border-surface-dark-border flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Next steps are optional and can be completed later.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="dark:border-surface-dark-border-strong inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Saving..." : "Save step 1"}
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing || saving || !canComplete}
                  className="bg-brand-primary-500 inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white transition hover:bg-yellow-600 disabled:opacity-50 dark:hover:bg-yellow-600"
                >
                  {completing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {completing ? "Completing..." : "Complete step 1"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
