"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Camera, CheckCircle2, Circle, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  completeOrganizationCreationStepOne,
  fetchOrganizationCreationStepOne,
  OrganizationBusinessRole,
  saveOrganizationCreationStepOne,
} from "@/app/_services/organization";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import { useOrganization } from "@/app/_contexts/organization-context";
import getStorageUrl from "@/app/_utils/get-storage-url";

const ROLE_LABELS: Record<OrganizationBusinessRole, string> = {
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

const FALLBACK_ROLE_OPTIONS: OrganizationBusinessRole[] = [
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
  org_name: string;
  unique_name: string;
  organization_role: OrganizationBusinessRole;
  description: string;
  default_locale: string;
  country: string;
  language: string;
};

const DEFAULT_FORM: StepOneForm = {
  org_name: "",
  unique_name: "",
  organization_role: "TECHNOLOGY",
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

export default function OrganizationCreatePage() {
  const router = useRouter();
  const { refreshOrganization, uploadLogo, organization } = useOrganization();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<OrganizationBusinessRole[]>(FALLBACK_ROLE_OPTIONS);
  const [form, setForm] = useState<StepOneForm>(DEFAULT_FORM);
  const [stepOneCompleted, setStepOneCompleted] = useState(false);

  const canComplete = useMemo(
    () =>
      Boolean(
        form.org_name.trim() &&
          form.unique_name.trim() &&
          form.organization_role &&
          form.default_locale.trim() &&
          form.country.trim() &&
          form.language.trim()
      ),
    [form]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchOrganizationCreationStepOne();
        const organization = response.organization;
        const availableRoles = (response.role_options || response.available_roles || []).filter(
          (role): role is OrganizationBusinessRole => FALLBACK_ROLE_OPTIONS.includes(role)
        );
        const resolvedRoleOptions = availableRoles.length
          ? availableRoles
          : FALLBACK_ROLE_OPTIONS;

        setRoleOptions(resolvedRoleOptions);
        const completedSteps = organization?.settings?.creation_steps?.completed_steps || [];
        setStepOneCompleted(Array.isArray(completedSteps) && completedSteps.includes("step_1"));
        if (organization) {
          const roleFromSettings = organization.settings?.organization_role;
          const resolvedRole = FALLBACK_ROLE_OPTIONS.includes(roleFromSettings)
            ? roleFromSettings
            : resolvedRoleOptions[0];

          setForm((prev) => ({
            ...prev,
            org_name: organization.org_name || "",
            unique_name: organization.unique_name || "",
            description: organization.description || "",
            organization_role: resolvedRole || prev.organization_role,
            default_locale: organization.default_locale || prev.default_locale,
            country: organization.country || "",
            language: organization.settings?.language || prev.language,
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            organization_role: resolvedRoleOptions[0] || prev.organization_role,
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
    if (!organization?.id) {
      toast.error("Salve o passo 1 pelo menos uma vez para enviar o logo.");
      return;
    }
    setLogoUploading(true);
    try {
      const updated = await uploadLogo(file);
      if (updated) await refreshOrganization();
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
      await saveOrganizationCreationStepOne({
        org_name: form.org_name,
        unique_name: form.unique_name,
        organization_role: form.organization_role,
        description: form.description || undefined,
        default_locale: form.default_locale || null,
        country: form.country ? form.country.toUpperCase() : null,
        language: form.language || null,
      });
      await refreshOrganization();
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
      await completeOrganizationCreationStepOne();
      await refreshOrganization();
      toast.success("Etapa 1 concluida");
      setStepOneCompleted(true);
      router.push("/organization/settings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao concluir etapa 1");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full flex-col gap-2">
      <WorkspaceHeader />
      <div className="grid w-full gap-2 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-md border border-zinc-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            Workspace creation steps
          </div>
          <div className="space-y-1">
            {CREATION_STEPS.map((step) => {
              const isCurrent = step.id === 1;
              const isDone = step.id < 1 || (step.id === 1 && stepOneCompleted);
              return (
                <div
                  key={step.key}
                  className={`rounded-md border p-2 ${
                    isCurrent
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-zinc-300"
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

        <section className="rounded-md border border-zinc-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 border-b border-zinc-200 pb-2 dark:border-surface-dark-border">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Step 1 - Basic information
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Required: name, unique name, role, locale, country and language.
            </p>
          </div>

          <form className="space-y-2" onSubmit={handleSave}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Organization name
                </label>
                <input
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                  placeholder="Acme Inc."
                  value={form.org_name}
                  onChange={handleFieldChange("org_name")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Unique name
                </label>
                <input
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                  placeholder="acme-inc"
                  value={form.unique_name}
                  onChange={handleFieldChange("unique_name")}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2 rounded-md border border-zinc-200 p-2 dark:border-surface-dark-border">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
                {organization?.logo_url ? (
                  <img
                    src={getStorageUrl(organization.logo_url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
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
                  disabled={logoUploading || !organization?.id}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex w-fit items-center gap-1 rounded-md border border-zinc-300 px-2 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-dark-border-strong dark:text-zinc-200 dark:hover:bg-neutral-800"
                >
                  {logoUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {logoUploading ? "Enviando..." : "Escolher imagem"}
                </button>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  PNG, JPG ou WebP. Depois de salvar o passo 1 uma vez, o upload fica disponível.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Organization role
              </label>
              <select
                aria-label="Organization role"
                className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                value={form.organization_role}
                onChange={handleFieldChange("organization_role")}
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
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Description (optional)
              </label>
              <textarea
                className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                placeholder="What does your workspace focus on?"
                rows={3}
                value={form.description}
                onChange={handleFieldChange("description")}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Locale</label>
                <input
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                  placeholder="en-US"
                  value={form.default_locale}
                  onChange={handleFieldChange("default_locale")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Country</label>
                <input
                  maxLength={2}
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm uppercase outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                  placeholder="BR"
                  value={form.country}
                  onChange={handleFieldChange("country")}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Language
                </label>
                <input
                  className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-2 text-sm lowercase outline-none focus:border-zinc-500 dark:border-surface-dark-border-strong"
                  placeholder="en"
                  value={form.language}
                  onChange={handleFieldChange("language")}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-2 dark:border-surface-dark-border">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Next steps are optional and can be completed later.
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Saving..." : "Save step 1"}
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing || saving || !canComplete}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-surface-dark-border-strong dark:text-zinc-200 dark:hover:bg-neutral-800"
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
