"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, CircleHelp } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useTheme } from "@/app/_contexts/theme-context";
import {
  submitOnboardingProfile,
  submitOnboardingWorkspace,
} from "@/app/_services/user-onboarding";

type Step = 1 | 2;

const steps = [
  {
    id: "profile",
    title: "Seu perfil",
    description: "Personalize sua experiência.",
  },
  {
    id: "workspace",
    title: "Seu workspace",
    description: "Crie o espaço para você e seu time.",
  },
] as const;

const emptyCompletedSteps: string[] = [];

/**
 * A single onboarding view: it owns the step forms, navigation and completion UI.
 * Backend completion is deliberately derived from `onboarding_state.completed_steps`.
 */
export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.user_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [themeMode, setThemeMode] = useState<"LIGHT" | "DARK">(
    user?.theme_mode?.toUpperCase() === "DARK" ? "DARK" : "LIGHT"
  );
  const [dateFormat, setDateFormat] = useState<"DD/MM/YYYY" | "YYYY-MM-DD">(
    user?.usage_preference?.language?.dateFormat === "YYYY-MM-DD" ? "YYYY-MM-DD" : "DD/MM/YYYY"
  );
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(
    user?.usage_preference?.language?.timeFormat === "12h" ? "12h" : "24h"
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const [uniqueName, setUniqueName] = useState("");

  const completedSteps = user?.onboarding_state?.completed_steps ?? emptyCompletedSteps;
  const completedCount = steps.filter(
    (step, index) => completedSteps.includes(step.id) || index + 1 < currentStep
  ).length;
  const completion = Math.round((completedCount / steps.length) * 100);

  useEffect(() => {
    const requestedStep = searchParams.get("step");
    const hasProfile = completedSteps.includes("profile");
    const hasWorkspace = completedSteps.includes("workspace");

    if (hasWorkspace && user?.org_public_id) {
      router.replace(`/${user.org_public_id}/home`);
      return;
    }

    // A user can revisit a completed profile, but cannot jump over it.
    if (requestedStep === "1") {
      setCurrentStep(1);
    } else if (requestedStep === "2" && hasProfile) {
      setCurrentStep(2);
    } else {
      setCurrentStep(hasProfile ? 2 : 1);
    }
  }, [completedSteps, router, searchParams, user?.org_public_id]);

  const currentStepMeta = steps[currentStep - 1];
  const isComplete = (step: (typeof steps)[number], index: number) =>
    completedSteps.includes(step.id) || index + 1 < currentStep;

  const progressLabel = useMemo(() => {
    if (completion === 100) return "Configuração concluída";
    return `${completion}% concluído`;
  }, [completion]);

  const handleThemeChange = (nextTheme: "LIGHT" | "DARK") => {
    setTheme(nextTheme === "DARK" ? "dark" : "light");
    setThemeMode(nextTheme);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await submitOnboardingProfile({
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(username.trim() && username.trim() !== user?.username
          ? { username: username.trim() }
          : {}),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        theme_mode: themeMode,
        usage_preference: {
          language: {
            dateFormat,
            interface: locale,
            timeFormat,
          },
        },
      });
      await refreshUser();
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar seu perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await submitOnboardingWorkspace({
        workspace_name: workspaceName,
        unique_name: uniqueName,
      });

      const refreshedUser = await refreshUser();
      if (!refreshedUser?.org_public_id) {
        throw new Error("Não foi possível carregar o workspace criado. Tente novamente.");
      }
      router.replace(`/${refreshedUser.org_public_id}/home`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar seu workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkspaceName = (value: string) => {
    setWorkspaceName(value);
    setUniqueName(value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
  };

  return (
    <main className="w-full">
      <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="order-2 flex items-center justify-center px-5 py-8 sm:px-10 lg:order-1 lg:px-16">
          <div className="w-full max-w-sm">
            <h1 className="text-brand-secondary-900 text-3xl font-bold tracking-tight dark:text-white">
              {currentStep === 1 ? "Vamos deixar tudo com a sua cara" : "Crie o seu workspace"}
            </h1>
            <p className="text-brand-secondary-500 mt-3 text-sm leading-6 dark:text-slate-400">
              {currentStepMeta.description}
            </p>

            {currentStep === 1 ? (
              <form onSubmit={handleProfileSubmit} className="mt-6 space-y-3">
                <Field label="Nome completo" optional>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    disabled={isLoading}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Nome de usuário" optional>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                    placeholder="seu-usuario"
                    maxLength={18}
                    disabled={isLoading}
                    className={inputClassName}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tema">
                    <select
                      value={themeMode}
                      onChange={(event) =>
                        handleThemeChange(event.target.value as "LIGHT" | "DARK")
                      }
                      disabled={isLoading}
                      className={inputClassName}
                    >
                      <option value="LIGHT">Claro</option>
                      <option value="DARK">Escuro</option>
                    </select>
                  </Field>
                  <Field label="Idioma">
                    <select
                      value={locale}
                      onChange={(event) =>
                        setLocale(event.target.value as "pt-BR" | "en-US" | "es-ES")
                      }
                      disabled={isLoading}
                      className={inputClassName}
                    >
                      <option value="pt-BR">Português</option>
                      <option value="en-US">English</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Formato da data">
                    <select
                      value={dateFormat}
                      onChange={(event) =>
                        setDateFormat(event.target.value as "DD/MM/YYYY" | "YYYY-MM-DD")
                      }
                      disabled={isLoading}
                      className={inputClassName}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </Field>
                  <Field label="Formato da hora">
                    <select
                      value={timeFormat}
                      onChange={(event) => setTimeFormat(event.target.value as "12h" | "24h")}
                      disabled={isLoading}
                      className={inputClassName}
                    >
                      <option value="24h">24 horas</option>
                      <option value="12h">12 horas</option>
                    </select>
                  </Field>
                </div>
                <FormError error={error} />
                <button type="submit" disabled={isLoading} className={primaryButtonClassName}>
                  {isLoading ? "Salvando..." : "Continuar"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleWorkspaceSubmit} className="mt-6 space-y-3">
                <Field label="Nome do workspace">
                  <input
                    value={workspaceName}
                    onChange={(event) => updateWorkspaceName(event.target.value)}
                    placeholder="Ex.: Minha empresa"
                    required
                    disabled={isLoading}
                    className={inputClassName}
                  />
                </Field>
                <Field label="URL única">
                  <div className="border-brand-secondary-200 focus-within:ring-brand-primary-500 flex overflow-hidden rounded-md border bg-white focus-within:ring-2 dark:border-slate-700 dark:bg-slate-900">
                    <span className="border-brand-secondary-200 bg-brand-secondary-50 text-brand-secondary-500 flex items-center border-r px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      theweave.app/
                    </span>
                    <input
                      value={uniqueName}
                      onChange={(event) =>
                        setUniqueName(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                      }
                      placeholder="minha-empresa"
                      required
                      disabled={isLoading}
                      className="text-brand-secondary-900 placeholder:text-brand-secondary-400 min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </Field>
                <FormError error={error} />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                    className="text-brand-secondary-600 hover:text-brand-navy inline-flex items-center gap-1.5 px-2 py-2.5 text-sm font-semibold transition disabled:opacity-50 dark:text-slate-300 dark:hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !workspaceName || !uniqueName}
                    className={`${primaryButtonClassName} flex-1`}
                  >
                    {isLoading ? "Criando..." : "Criar workspace"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <aside className="border-brand-secondary-100 bg-brand-secondary-50/70 order-1 border-b px-5 py-7 sm:px-8 lg:order-2 lg:border-b-0 lg:border-l lg:px-9 lg:py-10 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-brand-secondary-900 text-sm font-semibold dark:text-white">
                Seu progresso
              </p>
              <p className="text-brand-secondary-500 mt-1 text-xs dark:text-slate-400">
                {progressLabel}
              </p>
            </div>
            <span className="text-brand-navy dark:text-brand-primary-300 text-2xl font-bold tracking-tight">
              {completion}%
            </span>
          </div>
          <div className="bg-brand-secondary-200 mt-4 h-2 overflow-hidden rounded-full dark:bg-slate-700">
            <div
              className="bg-brand-primary-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>

          <ol className="mt-8 space-y-1" aria-label="Etapas do onboarding">
            {steps.map((step, index) => {
              const done = isComplete(step, index);
              const active = index + 1 === currentStep;
              const canNavigate = done && !active;

              return (
                <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {index < steps.length - 1 && (
                    <span
                      className={`absolute top-8 left-[0.95rem] h-6 w-px ${done ? "bg-brand-primary-500" : "bg-brand-secondary-200 dark:bg-slate-700"}`}
                    />
                  )}
                  <button
                    type="button"
                    disabled={!canNavigate}
                    onClick={() => setCurrentStep((index + 1) as Step)}
                    aria-current={active ? "step" : undefined}
                    className="group flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
                  >
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${done ? "border-brand-primary-500 bg-brand-primary-500 text-brand-navy" : active ? "border-brand-navy bg-brand-navy dark:border-brand-primary-500 dark:bg-brand-primary-500 dark:text-brand-navy text-white" : "border-brand-secondary-300 text-brand-secondary-400 bg-white dark:border-slate-600 dark:bg-[#242426]"}`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" strokeWidth={3} aria-label="Concluída" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="pt-0.5">
                      <span
                        className={`block text-sm font-semibold ${active || done ? "text-brand-secondary-900 dark:text-white" : "text-brand-secondary-400 dark:text-slate-500"}`}
                      >
                        {step.title}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-5 ${active ? "text-brand-secondary-500 dark:text-slate-400" : "text-brand-secondary-400 dark:text-slate-500"}`}
                      >
                        {step.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="border-brand-secondary-200 mt-10 rounded-xl border bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <CircleHelp
              className="text-brand-navy dark:text-brand-primary-300 h-4 w-4"
              aria-hidden="true"
            />
            <p className="text-brand-secondary-900 mt-2 text-xs font-semibold dark:text-white">
              Precisa de ajuda?
            </p>
            <p className="text-brand-secondary-500 mt-1 text-xs leading-5 dark:text-slate-400">
              Você pode voltar a uma etapa concluída para atualizar suas informações.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  children,
  label,
  optional = false,
}: {
  children: React.ReactNode;
  label: string;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-brand-secondary-700 text-xs font-semibold dark:text-slate-200">
        {label}{" "}
        {optional && <span className="text-brand-secondary-400 font-normal">(opcional)</span>}
      </span>
      {children}
    </label>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      {error}
    </div>
  );
}

const inputClassName =
  "w-full rounded-md border border-brand-secondary-200 bg-white px-3 py-2 text-sm text-brand-secondary-900 outline-none transition placeholder:text-brand-secondary-400 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const primaryButtonClassName =
  "rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-navy/15 transition hover:bg-[#062f5c] focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 dark:focus:ring-offset-[#242426]";
