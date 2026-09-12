"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, Moon, Sun } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useTheme } from "@/app/_contexts/theme-context";
import {
  submitOnboardingProfile,
  submitOnboardingWorkspace,
} from "@/app/_services/user-onboarding";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

const emptyCompletedSteps: string[] = [];

/**
 * Clean, minimal onboarding flow.
 * Focuses on clarity and simplicity, without unnecessary visual clutter.
 */
export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { locale, setLocale } = useLanguage();
  const { setTheme } = useTheme();

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

  useEffect(() => {
    const requestedStep = searchParams.get("step");
    const hasProfile = completedSteps.includes("profile");
    const hasWorkspace = completedSteps.includes("workspace");

    if (hasWorkspace && user?.org_public_id) {
      router.replace(`/${user.org_public_id}/home`);
      return;
    }

    if (requestedStep === "1") {
      setCurrentStep(1);
    } else if (requestedStep === "2" && hasProfile) {
      setCurrentStep(2);
    } else {
      setCurrentStep(hasProfile ? 2 : 1);
    }
  }, [completedSteps, router, searchParams, user?.org_public_id]);

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
    <main className="flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        {/* Subtle step progression */}
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium">
              {currentStep === 1 ? "Etapa 1 de 2 • Perfil" : "Etapa 2 de 2 • Workspace"}
            </span>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar ao perfil
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                currentStep >= 1
                  ? "bg-neutral-900 dark:bg-white"
                  : "bg-neutral-200 dark:bg-white/10"
              )}
            />
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                currentStep >= 2
                  ? "bg-neutral-900 dark:bg-white"
                  : "bg-neutral-200 dark:bg-white/10"
              )}
            />
          </div>
        </div>

        {/* Clean card container */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1d1d1b]">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
              {currentStep === 1
                ? "Vamos deixar tudo com a sua cara"
                : "Crie o seu workspace"}
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {currentStep === 1
                ? "Personalize sua experiência com suas preferências básicas."
                : "Defina o nome e a URL para você e seu time colaborarem."}
            </p>
          </div>

          {currentStep === 1 ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Field label="Nome completo" optional>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome de exibição"
                  disabled={isLoading}
                  className={inputClassName}
                />
              </Field>

              <Field label="Nome de usuário" optional>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  placeholder="seu.usuario"
                  maxLength={18}
                  disabled={isLoading}
                  className={inputClassName}
                />
              </Field>

              {/* Theme toggle segmented control */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Tema
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-1 dark:border-white/10 dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("LIGHT")}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-all",
                      themeMode === "LIGHT"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-white/10 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("DARK")}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-all",
                      themeMode === "DARK"
                        ? "bg-white text-neutral-900 shadow-xs dark:bg-white/10 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Escuro</span>
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <Field label="Idioma">
                <div className="relative">
                  <select
                    value={locale}
                    onChange={(event) =>
                      setLocale(event.target.value as "pt-BR" | "en-US" | "es-ES")
                    }
                    disabled={isLoading}
                    className={selectClassName}
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                </div>
              </Field>

              {/* Date & Time formats in clean 2 columns */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Formato da data">
                  <div className="relative">
                    <select
                      value={dateFormat}
                      onChange={(event) =>
                        setDateFormat(event.target.value as "DD/MM/YYYY" | "YYYY-MM-DD")
                      }
                      disabled={isLoading}
                      className={selectClassName}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  </div>
                </Field>
                <Field label="Formato da hora">
                  <div className="relative">
                    <select
                      value={timeFormat}
                      onChange={(event) => setTimeFormat(event.target.value as "12h" | "24h")}
                      disabled={isLoading}
                      className={selectClassName}
                    >
                      <option value="24h">24 horas</option>
                      <option value="12h">12 horas</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  </div>
                </Field>
              </div>

              <FormError error={error} />

              <div className="pt-2">
                <button type="submit" disabled={isLoading} className={primaryButtonClassName}>
                  {isLoading ? "Salvando..." : "Continuar"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
              <Field label="Nome do workspace">
                <input
                  value={workspaceName}
                  onChange={(event) => updateWorkspaceName(event.target.value)}
                  placeholder="Ex.: Minha Empresa ou Time"
                  required
                  disabled={isLoading}
                  className={inputClassName}
                />
              </Field>

              <Field label="URL única">
                <div className="flex overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors focus-within:border-neutral-900 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-white/40">
                  <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500 select-none dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
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
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-neutral-500"
                  />
                </div>
              </Field>

              <FormError error={error} />

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !workspaceName || !uniqueName}
                  className={primaryButtonClassName}
                >
                  {isLoading ? "Criando..." : "Criar workspace"}
                </button>
              </div>
            </form>
          )}
        </div>
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </span>
        {optional && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            opcional
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
    >
      {error}
    </div>
  );
}

const inputClassName =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-white/20 dark:focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-50";

const selectClassName =
  "w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-neutral-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-50 pr-9";

const primaryButtonClassName =
  "w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100";
