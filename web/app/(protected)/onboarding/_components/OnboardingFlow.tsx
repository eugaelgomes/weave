"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ImagePlus,
  Moon,
  Plus,
  Rocket,
  Shield,
  Sun,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useTheme } from "@/app/_contexts/theme-context";
import {
  checkWorkspaceUniqueNameAvailability,
  completeOnboarding,
  submitOnboardingTeams,
  submitOnboardingProfile,
  submitOnboardingWorkspace,
  uploadOnboardingWorkspaceLogo,
} from "@/app/_services/user-onboarding";
import { ApiError } from "@/app/_services/api-error";
import { checkUserAvailability } from "@/app/_services/authentication/auth.users";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type OnboardingTeam = { name: string; description: string };
type OnboardingMember = { email: string; name: string; teamIndex: number | null };
type WorkspaceIdentifierStatus = "idle" | "checking" | "available" | "unavailable" | "error";
type UsernameStatus = "idle" | "checking" | "available" | "unavailable" | "invalid" | "error";

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

const WORKSPACE_COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
  { value: "ES", label: "Espanha" },
  { value: "GB", label: "Reino Unido" },
  { value: "CA", label: "Canadá" },
  { value: "DE", label: "Alemanha" },
  { value: "FR", label: "França" },
];

function normalizeWorkspaceIdentifier(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
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
  const [workspaceCountry, setWorkspaceCountry] = useState("BR");
  const [workspaceLanguage, setWorkspaceLanguage] = useState<"pt-BR" | "en-US" | "es-ES">(locale);
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceTimezone, setWorkspaceTimezone] = useState(detectedTimezone);
  const [workspacePublicId, setWorkspacePublicId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [workspaceIdentifierStatus, setWorkspaceIdentifierStatus] =
    useState<WorkspaceIdentifierStatus>("idle");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [workspaceRole, setWorkspaceRole] = useState("team");
  const [showCreateWorkspaceForm, setShowCreateWorkspaceForm] = useState(false);
  const [showWorkspaceValidation, setShowWorkspaceValidation] = useState(false);
  const [showTeamsValidation, setShowTeamsValidation] = useState(false);
  const [teams, setTeams] = useState<OnboardingTeam[]>([]);
  const [members, setMembers] = useState<OnboardingMember[]>([]);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

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
    const hasTeams =
      completedSteps.includes("teams") || user?.onboarding_state?.step === "COMPLETED";

    if (hasWorkspace && hasProfile && hasTeams && user?.workspace_public_id) {
      router.replace(`/${user.workspace_public_id}/home`);
      return;
    }

    if (requestedStep === "1") {
      setCurrentStep(1);
    } else if (requestedStep === "2" && hasProfile && !hasWorkspace) {
      setCurrentStep(2);
    } else if (requestedStep === "3" && hasProfile && hasWorkspace) {
      setCurrentStep(3);
    } else {
      setCurrentStep(hasProfile ? (hasWorkspace ? 3 : 2) : 1);
    }
  }, [completedSteps, router, searchParams, user?.workspace_public_id]);

  useEffect(() => {
    const candidate = uniqueName.trim();
    if (!candidate) {
      setWorkspaceIdentifierStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setWorkspaceIdentifierStatus("checking");
      try {
        const result = await checkWorkspaceUniqueNameAvailability(candidate, controller.signal);
        if (!controller.signal.aborted) {
          setWorkspaceIdentifierStatus(result.available ? "available" : "unavailable");
        }
      } catch {
        if (!controller.signal.aborted) {
          setWorkspaceIdentifierStatus("error");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [uniqueName]);

  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (!candidate || candidate === user?.username) {
      setUsernameStatus("idle");
      return;
    }
    if (candidate.length < 6 || candidate.length > 18 || !/^[a-z0-9._-]+$/.test(candidate)) {
      setUsernameStatus("invalid");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const availability = await checkUserAvailability(
          { username: candidate },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setUsernameStatus(availability.username.available ? "available" : "unavailable");
        }
      } catch {
        if (!controller.signal.aborted) {
          setUsernameStatus("error");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user?.username, username]);

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
      setWorkspaceLanguage(locale);
      const refreshedUser = await refreshUser();
      const nextSteps = refreshedUser?.onboarding_state?.completed_steps || [];
      if (
        refreshedUser?.workspace_public_id &&
        (nextSteps.includes("teams") || refreshedUser?.onboarding_state?.step === "COMPLETED")
      ) {
        router.replace(`/${refreshedUser.workspace_public_id}/home`);
        return;
      }
      if (nextSteps.includes("workspace")) {
        setCurrentStep(3);
        return;
      }
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar seu perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptExistingWorkspace = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await completeOnboarding();
      const refreshedUser = await refreshUser();
      const targetWorkspace = refreshedUser?.workspace_public_id || user?.workspace_public_id;
      router.replace(targetWorkspace ? `/${targetWorkspace}/home` : "/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível acessar o workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!workspaceName.trim() || !uniqueName.trim()) {
      setShowWorkspaceValidation(true);
      setError("Preencha os campos obrigatórios para criar o workspace.");
      return;
    }

    if (workspaceIdentifierStatus !== "available") {
      setError("Escolha um identificador de workspace disponível para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const workspaceResponse = await submitOnboardingWorkspace({
        country: workspaceCountry,
        language: workspaceLanguage,
        workspace_description: workspaceDescription,
        workspace_name: workspaceName,
        unique_name: uniqueName,
        workspace_role: workspaceRole,
        workspace_timezone: workspaceTimezone,
      });
      setWorkspacePublicId(workspaceResponse.data.workspacePublicId);

      if (logoFile) {
        try {
          await uploadOnboardingWorkspaceLogo(logoFile);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? `Workspace criado, mas não foi possível enviar o logo: ${uploadError.message}`
              : "Workspace criado, mas não foi possível enviar o logo. Você pode tentar novamente nas configurações."
          );
        }
      }

      const refreshedUser = await refreshUser();
      if (!refreshedUser?.workspace_public_id && !workspaceResponse.data.workspacePublicId) {
        throw new Error("Não foi possível carregar o workspace criado. Tente novamente.");
      }
      setCurrentStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "WORKSPACE_UNIQUE_CONFLICT"
          ? "Este identificador de workspace já está em uso. Escolha outro."
          : err instanceof Error
            ? err.message
            : "Não foi possível criar seu workspace."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;

    const acceptedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!acceptedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Use uma imagem PNG, JPG ou WebP de até 2 MB.");
      return;
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setError(null);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const addTeam = () => setTeams((current) => [...current, { name: "", description: "" }]);

  const updateTeam = (index: number, field: keyof OnboardingTeam, value: string) => {
    setTeams((current) =>
      current.map((team, teamIndex) => (teamIndex === index ? { ...team, [field]: value } : team))
    );
  };

  const removeTeam = (index: number) => {
    setTeams((current) => current.filter((_, teamIndex) => teamIndex !== index));
    setMembers((current) =>
      current.map((member) => ({
        ...member,
        teamIndex:
          member.teamIndex === index
            ? null
            : member.teamIndex !== null && member.teamIndex > index
              ? member.teamIndex - 1
              : member.teamIndex,
      }))
    );
  };

  const addMember = () =>
    setMembers((current) => [...current, { email: "", name: "", teamIndex: null }]);

  const updateMember = (
    index: number,
    field: keyof OnboardingMember,
    value: string | number | null
  ) => {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  };

  const removeMember = (index: number) =>
    setMembers((current) => current.filter((_, memberIndex) => memberIndex !== index));

  const handleTeamsSubmit = async () => {
    const invalidTeam = teams.some((team) => !team.name.trim());
    const invalidMember = members.some((member) => !member.name.trim() || !member.email.trim());
    setShowTeamsValidation(true);
    if (invalidTeam || invalidMember) {
      setError("Preencha os nomes dos times e os dados de cada membro antes de continuar.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await submitOnboardingTeams({
        members: members.map((member) => ({
          email: member.email.trim(),
          name: member.name.trim(),
          ...(member.teamIndex !== null ? { team_index: member.teamIndex } : {}),
        })),
        teams: teams.map((team) => ({
          ...(team.description.trim() ? { description: team.description.trim() } : {}),
          name: team.name.trim(),
        })),
      });
      const refreshedUser = await refreshUser();
      const targetWorkspace =
        refreshedUser?.workspace_public_id || user?.workspace_public_id || workspacePublicId;
      router.replace(targetWorkspace ? `/${targetWorkspace}/home` : "/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a configuração.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkspaceName = (value: string) => {
    setWorkspaceName(value);
    setUniqueName(normalizeWorkspaceIdentifier(value));
  };

  const workspaceNameMissing = showWorkspaceValidation && !workspaceName.trim();
  const uniqueNameMissing = showWorkspaceValidation && !uniqueName.trim();

  const workspaceIdentifierMessage = uniqueNameMissing
    ? "Este campo é obrigatório."
    : workspaceIdentifierStatus === "checking"
      ? "Verificando disponibilidade..."
      : workspaceIdentifierStatus === "available"
        ? "Este identificador está disponível."
        : workspaceIdentifierStatus === "unavailable"
          ? "Este identificador já está em uso."
          : workspaceIdentifierStatus === "error"
            ? "Não foi possível verificar agora. Tente novamente em instantes."
            : null;

  const usernameMessage =
    usernameStatus === "checking"
      ? "Verificando disponibilidade..."
      : usernameStatus === "available"
        ? "Este nome de usuário está disponível."
        : usernameStatus === "unavailable"
          ? "Este nome de usuário já está em uso."
          : usernameStatus === "invalid"
            ? "Use de 6 a 18 caracteres: letras, números, ponto, hífen ou _."
            : usernameStatus === "error"
              ? "Não foi possível verificar agora."
              : null;

  const usernameChanged =
    username.trim().length > 0 && username.trim().toLowerCase() !== user?.username;

  const planDetails = user?.plan_details;
  const planLimits = planDetails?.limits;
  const planHighlights = [
    planLimits?.max_notes !== undefined
      ? `${planLimits.max_notes.toLocaleString("pt-BR")} notas`
      : null,
    planLimits?.max_projects !== undefined
      ? `${planLimits.max_projects.toLocaleString("pt-BR")} projetos`
      : null,
    planLimits?.max_team_members !== undefined
      ? `${planLimits.max_team_members.toLocaleString("pt-BR")} membros`
      : null,
    planLimits?.storage?.total_monthly_upload_mb !== undefined
      ? `${planLimits.storage.total_monthly_upload_mb.toLocaleString("pt-BR")} MB de upload/mês`
      : null,
    planDetails?.weave_ai?.enabled
      ? planDetails.weave_ai.config?.monthly_messages !== undefined
        ? `${planDetails.weave_ai.config.monthly_messages.toLocaleString("pt-BR")} mensagens IA/mês`
        : "Weave AI incluído"
      : null,
  ].filter((item): item is string => item !== null);
  const enabledPlanFeatures = Object.entries(planDetails?.features ?? {})
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature.replace(/_/g, " "));

  return (
    <main className="w-full flex-1 p-3.5 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="mx-auto w-full max-w-4xl space-y-5 py-1 pb-10 sm:space-y-6 sm:py-2 sm:pb-12 lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-6 lg:space-y-0">
        {/* Steps sidebar: stacks vertically on the right on desktop. */}
        <nav
          aria-label="Etapas do onboarding"
          className="grid grid-cols-1 divide-y divide-neutral-200/80 overflow-hidden rounded-xl border border-neutral-200/80 bg-white lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:self-start dark:divide-white/10 dark:border-white/10 dark:bg-[#1d1d1b]"
        >
          {/* Step 1 Overview */}
          <button
            type="button"
            onClick={() => {
              if (completedSteps.includes("profile") && currentStep !== 1) {
                setCurrentStep(1);
              }
            }}
            disabled={currentStep === 1 || !completedSteps.includes("profile")}
            className={cn(
              "flex items-center gap-3.5 p-4 text-left transition-colors",
              currentStep === 1
                ? "bg-neutral-100/70 dark:bg-white/[0.06]"
                : completedSteps.includes("profile")
                  ? "hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
                  : "opacity-60"
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
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
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
          <button
            type="button"
            disabled={
              currentStep === 2 ||
              !completedSteps.includes("profile") ||
              completedSteps.includes("workspace")
            }
            className={cn(
              "flex items-center gap-3.5 p-4 text-left transition-colors",
              currentStep === 2 ? "bg-neutral-100/70 dark:bg-white/[0.06]" : "opacity-75"
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
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {currentStep === 2 ? "Em andamento" : "Próxima etapa"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                Nome do espaço e finalidade
              </p>
            </div>
          </button>

          <div
            className={cn(
              "flex items-center gap-3.5 p-4 text-left transition-colors",
              currentStep === 3
                ? "bg-neutral-100/70 dark:bg-white/[0.06]"
                : completedSteps.includes("teams")
                  ? "bg-emerald-500/[0.03]"
                  : "opacity-75"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                currentStep === 3
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : completedSteps.includes("teams")
                    ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400"
              )}
            >
              {completedSteps.includes("teams") && currentStep !== 3 ? (
                <Check className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  3. Times e membros
                </span>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {currentStep === 3
                    ? "Em andamento"
                    : completedSteps.includes("teams")
                      ? "Concluído"
                      : "Próxima etapa"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                Convide pessoas ou organize seu time
              </p>
            </div>
          </div>
        </nav>

        {/* Wide Main Card Container */}
        <div className="sm:px-4 sm:py-4 lg:col-start-1 lg:row-start-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Form Column */}
            <div className="lg:col-span-12">
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl lg:text-2xl dark:text-white">
                  {currentStep === 1
                    ? "Vamos deixar tudo com a sua cara"
                    : currentStep === 3
                      ? "Monte seu espaço de colaboração"
                      : user?.workspace_public_id && !showCreateWorkspaceForm
                        ? "Seu workspace convidado"
                        : "Crie o seu workspace"}
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {currentStep === 1
                    ? "Configure seu nome de exibição, preferências de idioma e aparência."
                    : currentStep === 3
                      ? "Crie times e envie convites agora, ou deixe essa organização para depois."
                      : user?.workspace_public_id && !showCreateWorkspaceForm
                        ? "Você foi convidado para colaborar em um workspace existente."
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
                        <div
                          className={cn(
                            "flex overflow-hidden rounded-lg border bg-white transition-colors focus-within:border-neutral-900 dark:bg-white/[0.04] dark:focus-within:border-white/40",
                            usernameStatus === "available"
                              ? "border-emerald-500/70 dark:border-emerald-400/70"
                              : usernameStatus === "unavailable" || usernameStatus === "invalid"
                                ? "border-red-500/70 dark:border-red-400/70"
                                : "border-neutral-200 dark:border-white/10"
                          )}
                        >
                          <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-500 select-none dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
                            @
                          </span>
                          <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value.toLowerCase())}
                            placeholder="gael.rens"
                            maxLength={18}
                            disabled={isLoading}
                            aria-describedby="username-status"
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-neutral-500"
                          />
                        </div>
                        <p
                          id="username-status"
                          aria-live="polite"
                          className={cn(
                            "min-h-4 text-xs",
                            usernameStatus === "available"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : usernameStatus === "unavailable" || usernameStatus === "invalid"
                                ? "text-red-600 dark:text-red-400"
                                : "text-neutral-500 dark:text-neutral-400"
                          )}
                        >
                          {usernameMessage}
                        </p>
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
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                      </div>
                    </Field>
                  </div>

                  {/* Appearance & Locale section */}
                  <div className="space-y-3.5 border-t border-neutral-100 pt-2 dark:border-white/5">
                    {/* Theme Mode Toggle */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Tema do aplicativo <span className="text-red-500">*</span>
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
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
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
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
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
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </Field>
                    </div>
                  </div>

                  <FormError error={error} />

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isLoading || (usernameChanged && usernameStatus !== "available")}
                      className={primaryButtonClassName}
                    >
                      {isLoading ? "Salvando perfil..." : "Salvar e continuar"}
                    </button>
                  </div>
                </form>
              ) : currentStep === 3 ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4 text-sm text-neutral-600 dark:border-white/15 dark:bg-white/[0.02] dark:text-neutral-300">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      Esta etapa é opcional.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                      Você poderá criar mais times e convidar pessoas depois nas configurações do
                      workspace.
                    </p>
                  </div>

                  {(workspacePublicId || user?.workspace_public_id) && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200/80 px-3 py-2.5 dark:border-white/10">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        ID público do workspace
                      </span>
                      <code className="truncate text-xs font-medium text-neutral-900 dark:text-white">
                        {workspacePublicId || user?.workspace_public_id}
                      </code>
                    </div>
                  )}

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Times
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          Separe pessoas por área, projeto ou função.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addTeam}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar time
                      </button>
                    </div>
                    {teams.length > 0 && (
                      <div className="space-y-2.5">
                        {teams.map((team, index) => (
                          <div
                            key={index}
                            className="grid gap-2 rounded-xl border border-neutral-200/80 p-3 sm:grid-cols-[1fr_1.15fr_auto] dark:border-white/10"
                          >
                            <input
                              value={team.name}
                              onChange={(event) => updateTeam(index, "name", event.target.value)}
                              placeholder="Nome do time *"
                              disabled={isLoading}
                              aria-label="Nome do time (obrigatório)"
                              aria-required="true"
                              className={cn(
                                inputClassName,
                                showTeamsValidation && !team.name.trim() && "!border-red-500"
                              )}
                            />
                            <input
                              value={team.description}
                              onChange={(event) =>
                                updateTeam(index, "description", event.target.value)
                              }
                              placeholder="Descrição (opcional)"
                              disabled={isLoading}
                              className={inputClassName}
                            />
                            <button
                              type="button"
                              onClick={() => removeTeam(index)}
                              disabled={isLoading}
                              aria-label={`Remover ${team.name || "time"}`}
                              className="inline-flex h-9 w-9 items-center justify-center self-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 border-t border-neutral-100 pt-5 dark:border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Membros
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          Convide por e-mail e, se quiser, já associe a um novo time.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addMember}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Convidar pessoa
                      </button>
                    </div>
                    {members.length > 0 && (
                      <div className="space-y-2.5">
                        {members.map((member, index) => (
                          <div
                            key={index}
                            className="grid gap-2 rounded-xl border border-neutral-200/80 p-3 sm:grid-cols-[1fr_1.2fr_1fr_auto] dark:border-white/10"
                          >
                            <input
                              value={member.name}
                              onChange={(event) => updateMember(index, "name", event.target.value)}
                              placeholder="Nome *"
                              disabled={isLoading}
                              aria-label="Nome do membro (obrigatório)"
                              aria-required="true"
                              className={cn(
                                inputClassName,
                                showTeamsValidation && !member.name.trim() && "!border-red-500"
                              )}
                            />
                            <input
                              type="email"
                              value={member.email}
                              onChange={(event) => updateMember(index, "email", event.target.value)}
                              placeholder="email@empresa.com *"
                              disabled={isLoading}
                              aria-label="E-mail do membro (obrigatório)"
                              aria-required="true"
                              className={cn(
                                inputClassName,
                                showTeamsValidation && !member.email.trim() && "!border-red-500"
                              )}
                            />
                            <select
                              value={member.teamIndex ?? ""}
                              onChange={(event) =>
                                updateMember(
                                  index,
                                  "teamIndex",
                                  event.target.value === "" ? null : Number(event.target.value)
                                )
                              }
                              disabled={isLoading || teams.length === 0}
                              className={selectClassName}
                            >
                              <option value="">Sem time por enquanto</option>
                              {teams.map((team, teamIndex) => (
                                <option key={teamIndex} value={teamIndex}>
                                  {team.name || `Time ${teamIndex + 1}`}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeMember(index)}
                              disabled={isLoading}
                              aria-label={`Remover ${member.name || "membro"}`}
                              className="inline-flex h-9 w-9 items-center justify-center self-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <FormError error={error} />
                  <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleTeamsSubmit}
                      disabled={isLoading}
                      className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                    >
                      {isLoading
                        ? "Finalizando..."
                        : teams.length || members.length
                          ? "Salvar e concluir"
                          : "Pular por enquanto"}
                    </button>
                  </div>
                </div>
              ) : user?.workspace_public_id && !showCreateWorkspaceForm ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="mb-3 flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">
                          {user?.user_workspace?.name ||
                            user?.workspace_name ||
                            "Workspace Convidado"}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Você já possui um convite ativo e acesso a este workspace.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Você pode começar a colaborar imediatamente com sua equipe no espaço oficial
                      sem precisar criar um novo espaço.
                    </p>
                  </div>

                  <FormError error={error} />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleAcceptExistingWorkspace}
                      disabled={isLoading}
                      className={primaryButtonClassName}
                    >
                      {isLoading ? "Acessando..." : "Entrar no workspace"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateWorkspaceForm(true)}
                      disabled={isLoading}
                      className="px-1 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
                    >
                      Ou criar um workspace novo
                    </button>
                  </div>
                </div>
              ) : (
                <form noValidate onSubmit={handleWorkspaceSubmit} className="space-y-5">
                  {user?.workspace_public_id && (
                    <div className="pb-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateWorkspaceForm(false)}
                        disabled={isLoading}
                        className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-white"
                      >
                        ← Voltar para o workspace convidado
                      </button>
                    </div>
                  )}
                  <div className="space-y-3.5">
                    <div className="grid gap-3.5 sm:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
                      <Field label="Logo do workspace" optional>
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-2.5 dark:border-white/10 dark:bg-white/[0.02]">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            {logoPreviewUrl ? (
                              // The preview is a local object URL, never an untrusted remote source.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logoPreviewUrl}
                                alt="Prévia do logo"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlus className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              ref={logoFileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handleLogoFileChange}
                              disabled={isLoading}
                              className="sr-only"
                            />
                            <button
                              type="button"
                              onClick={() => logoFileInputRef.current?.click()}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                              {logoFile ? "Trocar imagem" : "Escolher imagem"}
                            </button>
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                              {logoFile?.name || "PNG, JPG ou WebP de até 2 MB."}
                            </p>
                          </div>
                        </div>
                      </Field>

                      <div className="space-y-3.5">
                        <Field
                          label="Nome do workspace"
                          error={workspaceNameMissing ? "Este campo é obrigatório." : undefined}
                        >
                          <input
                            value={workspaceName}
                            onChange={(event) => updateWorkspaceName(event.target.value)}
                            placeholder="Ex.: Acme Corp ou Design Studio"
                            required
                            disabled={isLoading}
                            aria-invalid={workspaceNameMissing}
                            className={cn(
                              inputClassName,
                              workspaceNameMissing && "!border-red-500"
                            )}
                          />
                        </Field>

                        <Field label="URL única de acesso">
                          <div
                            className={cn(
                              "flex overflow-hidden rounded-lg border bg-white transition-colors focus-within:border-neutral-900 dark:bg-white/[0.04] dark:focus-within:border-white/40",
                              workspaceIdentifierStatus === "available"
                                ? "border-emerald-500/70 dark:border-emerald-400/70"
                                : workspaceIdentifierStatus === "unavailable" || uniqueNameMissing
                                  ? "border-red-500/70 dark:border-red-400/70"
                                  : "border-neutral-200 dark:border-white/10"
                            )}
                          >
                            <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500 select-none dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
                              theweave.app/
                            </span>
                            <input
                              value={uniqueName}
                              onChange={(event) =>
                                setUniqueName(normalizeWorkspaceIdentifier(event.target.value))
                              }
                              placeholder="minha-empresa"
                              required
                              disabled={isLoading}
                              aria-invalid={uniqueNameMissing}
                              aria-describedby="workspace-identifier-status"
                              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-neutral-500"
                            />
                          </div>
                          <p
                            id="workspace-identifier-status"
                            aria-live="polite"
                            className={cn(
                              "min-h-4 text-xs",
                              workspaceIdentifierStatus === "available"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : workspaceIdentifierStatus === "unavailable" || uniqueNameMissing
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-neutral-500 dark:text-neutral-400"
                            )}
                          >
                            {workspaceIdentifierMessage}
                          </p>
                        </Field>
                      </div>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <Field label="País do workspace">
                        <div className="relative">
                          <select
                            value={workspaceCountry}
                            onChange={(event) => setWorkspaceCountry(event.target.value)}
                            disabled={isLoading}
                            className={selectClassName}
                          >
                            {WORKSPACE_COUNTRIES.map((country) => (
                              <option key={country.value} value={country.value}>
                                {country.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </Field>

                      <Field label="Idioma do workspace">
                        <div className="relative">
                          <select
                            value={workspaceLanguage}
                            onChange={(event) =>
                              setWorkspaceLanguage(
                                event.target.value as "pt-BR" | "en-US" | "es-ES"
                              )
                            }
                            disabled={isLoading}
                            className={selectClassName}
                          >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (United States)</option>
                            <option value="es-ES">Español (España)</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Purpose selection cards */}
                  <div className="space-y-2 border-t border-neutral-100 pt-2 dark:border-white/5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Como você pretende usar o The Weave? <span className="text-red-500">*</span>
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
                                ? "border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900/10 dark:border-white/40 dark:bg-white/[0.06] dark:ring-white/20"
                                : "border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                            )}
                          >
                            <div
                              className={cn(
                                "mb-2.5 flex h-7 w-7 items-center justify-center rounded-md",
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
                            <span className="mt-1 line-clamp-2 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                              {purpose.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <details className="group border-t border-neutral-100 pt-4 dark:border-white/5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-neutral-700 marker:content-none dark:text-neutral-300">
                      Preferências opcionais
                      <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180 dark:text-neutral-500" />
                    </summary>
                    <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                      <Field label="Descrição do workspace" optional>
                        <textarea
                          value={workspaceDescription}
                          onChange={(event) => setWorkspaceDescription(event.target.value)}
                          placeholder="Conte brevemente como o espaço será usado"
                          maxLength={500}
                          disabled={isLoading}
                          className="min-h-24 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 transition outline-none placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-white/20 dark:focus:border-white/40"
                        />
                      </Field>

                      <Field label="Fuso horário do workspace" optional>
                        <div className="relative">
                          <select
                            value={workspaceTimezone}
                            onChange={(event) => setWorkspaceTimezone(event.target.value)}
                            disabled={isLoading}
                            className={selectClassName}
                          >
                            {timezoneOptions.map((timezoneOption) => (
                              <option key={timezoneOption.value} value={timezoneOption.value}>
                                {timezoneOption.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </Field>
                    </div>
                  </details>

                  <div className="space-y-3 border-t border-neutral-100 pt-5 dark:border-white/5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                          Seu plano atual: {user?.plan_name || "Plano inicial"}
                        </p>
                        <p className="mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                          Este workspace será criado com o plano vinculado à sua conta. Você pode
                          mudar de plano a qualquer momento.
                        </p>
                      </div>
                    </div>

                    {planHighlights.length > 0 || enabledPlanFeatures.length > 0 ? (
                      <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                        {planHighlights.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {planHighlights.map((highlight) => (
                              <span
                                key={highlight}
                                className="rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-white/10 dark:text-neutral-200"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}
                        {enabledPlanFeatures.length > 0 && (
                          <p className="mt-2 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                            Recursos incluídos: {enabledPlanFeatures.join(", ")}.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 text-xs leading-4 text-neutral-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
                        Inclui o essencial para começar: notas, projetos, colaboração e recursos
                        disponíveis para o seu plano.
                      </div>
                    )}
                  </div>

                  <FormError error={error} />

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || workspaceIdentifierStatus === "checking"}
                      className={primaryButtonClassName}
                    >
                      {isLoading ? "Criando workspace..." : "Criar workspace"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  children,
  error,
  label,
  optional = false,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {!optional && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {optional && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">opcional</span>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
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
