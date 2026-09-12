"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Globe,
  Moon,
  Rocket,
  Shield,
  Sun,
  User,
  Users,
} from "lucide-react";
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

const COMMON_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/New_York", label: "Nova York (EST / GMT-5)" },
  { value: "America/Chicago", label: "Chicago (CST / GMT-6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST / GMT-8)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/Madrid", label: "Madri (CET / GMT+1)" },
  { value: "Europe/Paris", label: "Paris (CET / GMT+1)" },
  { value: "Asia/Tokyo", label: "Tóquio (JST / GMT+9)" },
  { value: "UTC", label: "UTC (Tempo Coordenado)" },
];

const WORKSPACE_PURPOSES = [
  {
    id: "team",
    title: "Trabalho em equipe",
    description: "Para times colaborarem em notas, docs e projetos.",
    icon: Users,
  },
  {
    id: "startup",
    title: "Empresa ou Startup",
    description: "Gestão completa de múltiplos departamentos e times.",
    icon: Rocket,
  },
  {
    id: "personal",
    title: "Pessoal & Estudos",
    description: "Para notas individuais, pesquisas e planejamento.",
    icon: Briefcase,
  },
];

function getInitials(nameString?: string, usernameString?: string): string {
  const target = (nameString || usernameString || "W").trim();
  const parts = target.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
}

/**
 * Modern, wide, clean onboarding flow.
 * Features a top step overview, 2-column layout with live preview and rich input options.
 */
export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { locale, setLocale } = useLanguage();
  const { setTheme } = useTheme();

  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    } catch {
      return "America/Sao_Paulo";
    }
  }, []);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.user_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [timezone, setTimezone] = useState(detectedTimezone);
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
  const [workspaceRole, setWorkspaceRole] = useState("team");

  const completedSteps = user?.onboarding_state?.completed_steps ?? emptyCompletedSteps;

  const timezoneOptions = useMemo(() => {
    const list = [...COMMON_TIMEZONES];
    if (detectedTimezone && !list.some((tz) => tz.value === detectedTimezone)) {
      list.unshift({ value: detectedTimezone, label: `${detectedTimezone} (Detectado)` });
    }
    return list;
  }, [detectedTimezone]);

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
        timezone: timezone.trim() || detectedTimezone,
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
        workspace_role: workspaceRole,
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

  const userInitials = useMemo(
    () => getInitials(name || user?.user_name, username || user?.username),
    [name, user?.user_name, username, user?.username]
  );

  const workspaceInitials = useMemo(
    () => getInitials(workspaceName, uniqueName),
    [workspaceName, uniqueName]
  );

  return (
    <main className="mx-2 flex h-full min-h-0 w-auto flex-1 flex-col overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8">
      <div className="mx-auto my-auto w-full max-w-4xl space-y-5 sm:space-y-6 py-2 sm:py-4">
        {/* Superior Horizontal Stepper Overview */}
        <nav
          aria-label="Etapas do onboarding"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {/* Step 1 Overview */}
          <button
            type="button"
            onClick={() => {
              if (completedSteps.includes("profile") && currentStep === 2) {
                setCurrentStep(1);
              }
            }}
            disabled={currentStep === 1 || !completedSteps.includes("profile")}
            className={cn(
              "flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all",
              currentStep === 1
                ? "border-neutral-900 bg-white shadow-xs dark:border-white/30 dark:bg-[#1d1d1b]"
                : completedSteps.includes("profile")
                  ? "border-neutral-200/80 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                  : "border-neutral-200/50 opacity-60 dark:border-white/5"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                currentStep === 1
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : completedSteps.includes("profile")
                    ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400"
              )}
            >
              {completedSteps.includes("profile") && currentStep !== 1 ? (
                <Check className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  1. Perfil pessoal
                </span>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {currentStep === 1
                    ? "Em andamento"
                    : completedSteps.includes("profile")
                      ? "Concluído"
                      : "Pendente"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                Identificação, fuso e preferências
              </p>
            </div>
          </button>

          {/* Step 2 Overview */}
          <div
            className={cn(
              "flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all",
              currentStep === 2
                ? "border-neutral-900 bg-white shadow-xs dark:border-white/30 dark:bg-[#1d1d1b]"
                : "border-neutral-200/80 bg-white/60 dark:border-white/10 dark:bg-white/[0.02] opacity-75"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                currentStep === 2
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400"
              )}
            >
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  2. Workspace
                </span>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {currentStep === 2 ? "Em andamento" : "Próxima etapa"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                Nome do espaço e finalidade
              </p>
            </div>
          </div>
        </nav>

        {/* Wide Main Card Container */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1d1d1b]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Form Column */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                  {currentStep === 1
                    ? "Vamos deixar tudo com a sua cara"
                    : "Crie o seu workspace"}
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {currentStep === 1
                    ? "Configure seu nome de exibição, preferências de idioma e aparência."
                    : "Defina o nome da sua organização, URL pública e o modo de trabalho."}
                </p>
              </div>

              {currentStep === 1 ? (
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  {/* Identification section */}
                  <div className="space-y-3.5">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <Field label="Nome completo" optional>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Ex.: Gael Rens"
                          disabled={isLoading}
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Nome de usuário" optional>
                        <div className="flex overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors focus-within:border-neutral-900 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-white/40">
                          <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-500 select-none dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
                            @
                          </span>
                          <input
                            value={username}
                            onChange={(event) =>
                              setUsername(event.target.value.toLowerCase())
                            }
                            placeholder="gael.rens"
                            maxLength={18}
                            disabled={isLoading}
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-neutral-500"
                          />
                        </div>
                      </Field>
                    </div>

                    <Field label="Fuso horário">
                      <div className="relative">
                        <select
                          value={timezone}
                          onChange={(event) => setTimezone(event.target.value)}
                          disabled={isLoading}
                          className={selectClassName}
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                      </div>
                    </Field>
                  </div>

                  {/* Appearance & Locale section */}
                  <div className="space-y-3.5 pt-2 border-t border-neutral-100 dark:border-white/5">
                    {/* Theme Mode Toggle */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Tema do aplicativo
                      </span>
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 p-1 dark:border-white/10 dark:bg-white/[0.02]">
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
                          <span>Modo Claro</span>
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
                          <span>Modo Escuro</span>
                        </button>
                      </div>
                    </div>

                    {/* Regional settings grid */}
                    <div className="grid gap-3 sm:grid-cols-3">
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
                            <option value="pt-BR">Português</option>
                            <option value="en-US">English</option>
                            <option value="es-ES">Español</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </Field>

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
                            onChange={(event) =>
                              setTimeFormat(event.target.value as "12h" | "24h")
                            }
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
                  </div>

                  <FormError error={error} />

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={primaryButtonClassName}
                    >
                      {isLoading ? "Salvando perfil..." : "Salvar e continuar"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleWorkspaceSubmit} className="space-y-5">
                  <div className="space-y-3.5">
                    <Field label="Nome do workspace">
                      <input
                        value={workspaceName}
                        onChange={(event) => updateWorkspaceName(event.target.value)}
                        placeholder="Ex.: Acme Corp ou Design Studio"
                        required
                        disabled={isLoading}
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="URL única de acesso">
                      <div className="flex overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors focus-within:border-neutral-900 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-white/40">
                        <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500 select-none dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
                          theweave.app/
                        </span>
                        <input
                          value={uniqueName}
                          onChange={(event) =>
                            setUniqueName(
                              event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                            )
                          }
                          placeholder="minha-empresa"
                          required
                          disabled={isLoading}
                          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-neutral-500"
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Purpose selection cards */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-white/5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Como você pretende usar o The Weave?
                    </span>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {WORKSPACE_PURPOSES.map((purpose) => {
                        const Icon = purpose.icon;
                        const isSelected = workspaceRole === purpose.id;
                        return (
                          <button
                            key={purpose.id}
                            type="button"
                            onClick={() => setWorkspaceRole(purpose.id)}
                            disabled={isLoading}
                            className={cn(
                              "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                              isSelected
                                ? "border-neutral-900 bg-neutral-50/80 dark:border-white/40 dark:bg-white/[0.06] ring-1 ring-neutral-900/10 dark:ring-white/20"
                                : "border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-md mb-2.5",
                                isSelected
                                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                  : "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                              {purpose.title}
                            </span>
                            <span className="mt-1 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400 line-clamp-2">
                              {purpose.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <FormError error={error} />

                  <div className="flex items-center gap-3 pt-3">
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
                      {isLoading ? "Criando workspace..." : "Criar workspace"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Live Interactive Preview Column */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-5 dark:border-white/5 dark:bg-white/[0.02] self-start lg:sticky lg:top-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {currentStep === 1 ? "Prévia do Perfil" : "Prévia do Workspace"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    Tempo real
                  </span>
                </div>

                {currentStep === 1 ? (
                  <div className="mt-5 space-y-4">
                    {/* User Card Preview */}
                    <div className="flex items-center gap-3.5 rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs dark:border-white/10 dark:bg-[#1d1d1b]">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white shadow-xs dark:bg-white dark:text-neutral-900">
                        {userInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                          {name.trim() || user?.user_name || "Seu Nome"}
                        </p>
                        <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                          @{username.trim() || user?.username || "seu.usuario"}
                        </p>
                      </div>
                    </div>

                    {/* Preferences Highlights */}
                    <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-white/[0.03]">
                        <span className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                          <Globe className="h-3.5 w-3.5" />
                          Idioma
                        </span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {locale === "pt-BR"
                            ? "Português"
                            : locale === "es-ES"
                              ? "Español"
                              : "English"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-white/[0.03]">
                        <span className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                          {themeMode === "DARK" ? (
                            <Moon className="h-3.5 w-3.5" />
                          ) : (
                            <Sun className="h-3.5 w-3.5" />
                          )}
                          Tema
                        </span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {themeMode === "DARK" ? "Escuro" : "Claro"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-white/[0.03]">
                        <span className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                          <Calendar className="h-3.5 w-3.5" />
                          Data
                        </span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {dateFormat === "DD/MM/YYYY" ? "12/09/2026" : "2026-09-12"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-white/[0.03]">
                        <span className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                          <Clock className="h-3.5 w-3.5" />
                          Hora
                        </span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {timeFormat === "24h" ? "20:30" : "08:30 PM"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {/* Workspace Card Preview */}
                    <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#1d1d1b]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
                          {workspaceInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                            {workspaceName.trim() || "Nome do Workspace"}
                          </p>
                          <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                            theweave.app/{uniqueName.trim() || "url-workspace"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 dark:text-neutral-500">Seu papel</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 inline-flex items-center gap-1">
                          <Shield className="h-3 w-3 text-brand-primary-500" />
                          Administrador
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/70 p-3 text-xs text-neutral-600 dark:bg-white/[0.03] dark:text-neutral-400 space-y-1">
                      <p className="font-medium text-neutral-900 dark:text-white">
                        O que acontece a seguir?
                      </p>
                      <p className="text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
                        Seu workspace será gerado automaticamente com notas, calendário e espaço de equipe prontos para uso.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-neutral-200/60 dark:border-white/5 text-[11px] text-neutral-400 dark:text-neutral-500">
                Você pode atualizar essas preferências a qualquer momento nas configurações da sua conta.
              </div>
            </div>
          </div>
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
