"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useNotes, type SearchUser } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import type { CreateProjectData, ProjectStage } from "@/app/_services/projects-service/projects-service";
import {
  fetchProjectStages,
  patchProjectStage,
  postProjectCollaborator,
  putProjectAiReportConfig,
  updateProject,
  type AiReportConfigUpsertPayload,
} from "@/app/_services/projects-service/projects-service";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { ApplicationPageNav } from "@/app/(protected)/_components/ui/ApplicationPageNav";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  LayoutGrid,
  List,
  Loader2,
  ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  Trello,
  Upload,
  Users,
} from "lucide-react";

const METHODOLOGY_OPTIONS: Array<{
  id: CreateProjectData["methodology"];
  name: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "kanban",
    name: "Kanban",
    icon: <Trello className="h-4 w-4" />,
    description: "Fluxo contínuo com colunas: Backlog → To Do → Doing → Done.",
  },
  {
    id: "scrum",
    name: "Scrum",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "Iterações em sprints com Product Backlog e Review.",
  },
];

const VIEW_OPTIONS: Array<{
  id: CreateProjectData["default_view"];
  name: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "board",
    name: "Board",
    icon: <Trello className="h-4 w-4" />,
    description: "Visualização kanban em cartões por coluna.",
  },
  {
    id: "list",
    name: "Lista",
    icon: <List className="h-4 w-4" />,
    description: "Visualização linear de todas as tarefas.",
  },
];

/** #RGB or #RRGGBB (same rules as API hex validation). */
function normalizeProjectColorHex(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [, a, b, c] = h.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/i) || [];
    if (a && b && c) return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return null;
}

function hexForColorInput(hex: string, fallback: string): string {
  const n = normalizeProjectColorHex(hex);
  if (n) return n;
  const f = normalizeProjectColorHex(fallback);
  return f ?? "#eab308";
}

/** Default board columns (aligned with API normalizer). */
const METHODOLOGY_STAGE_DEFAULTS: Record<
  NonNullable<CreateProjectData["methodology"]> & string,
  Array<{ name: string; color: string }>
> = {
  kanban: [
    { name: "Backlog", color: "#94a3b8" },
    { name: "To Do", color: "#e2e8f0" },
    { name: "Doing", color: "#bfdbfe" },
    { name: "Done", color: "#bbf7d0" },
  ],
  scrum: [
    { name: "Product Backlog", color: "#94a3b8" },
    { name: "Sprint Backlog", color: "#e2e8f0" },
    { name: "In Progress", color: "#bfdbfe" },
    { name: "Review / QA", color: "#fef08a" },
    { name: "Done", color: "#bbf7d0" },
  ],
  waterfall: [
    { name: "Planeado", color: "#94a3b8" },
    { name: "Em curso", color: "#bfdbfe" },
    { name: "Concluído", color: "#bbf7d0" },
  ],
  custom: [
    { name: "Backlog", color: "#94a3b8" },
    { name: "To Do", color: "#e2e8f0" },
    { name: "Doing", color: "#bfdbfe" },
    { name: "Done", color: "#bbf7d0" },
  ],
};

const COLLAB_ROLES: Array<{ value: string; label: string }> = [
  { value: "contributor", label: "Contribuidor" },
  { value: "project_manager", label: "Gestor de projeto" },
  { value: "commenter", label: "Comentador" },
  { value: "viewer", label: "Leitor" },
];

type FormState = {
  title: string;
  description: string;
  methodology: NonNullable<CreateProjectData["methodology"]>;
  default_view: NonNullable<CreateProjectData["default_view"]>;
  color: string;
};

const ICON_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
const MAX_ICON_BYTES = 2 * 1024 * 1024;

type StageDraft = { name: string; color: string };

type PendingCollaborator = {
  userId: string;
  username: string;
  name?: string;
  email: string;
  avatar_url?: string | null;
  role: string;
};

function stageDefaultsFor(methodology: FormState["methodology"]): StageDraft[] {
  const key = (methodology ?? "kanban") as keyof typeof METHODOLOGY_STAGE_DEFAULTS;
  const list = METHODOLOGY_STAGE_DEFAULTS[key] ?? METHODOLOGY_STAGE_DEFAULTS.kanban;
  return list.map((s) => ({ ...s }));
}

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, loading, error: contextError } = useProjects();
  const { searchUsers } = useNotes();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    methodology: "kanban",
    default_view: "board",
    color: "#eab308",
  });

  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [postCreateBusy, setPostCreateBusy] = useState(false);

  const [customizeStages, setCustomizeStages] = useState(false);
  const [stageDrafts, setStageDrafts] = useState<StageDraft[]>(() => stageDefaultsFor("kanban"));

  const [collabSearch, setCollabSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [inviteRole, setInviteRole] = useState("contributor");
  const [pendingCollaborators, setPendingCollaborators] = useState<PendingCollaborator[]>([]);

  const [configureReports, setConfigureReports] = useState(false);
  const [reportForm, setReportForm] = useState<AiReportConfigUpsertPayload>({
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
  });

  const methodologyKey = useMemo(() => form.methodology ?? "kanban", [form.methodology]);

  useEffect(() => {
    if (customizeStages) {
      setStageDrafts(stageDefaultsFor(methodologyKey as FormState["methodology"]));
    }
  }, [methodologyKey, customizeStages]);

  useEffect(() => {
    if (!iconFile) {
      setIconPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  const onPickIconFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("O ícone tem de ser uma imagem (JPEG, PNG, WebP, GIF ou SVG).");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setSubmitError("Imagem demasiado grande. Tamanho máximo: 2 MB.");
      return;
    }
    setSubmitError(null);
    setIconFile(file);
  };

  const clearIconFile = () => {
    setIconFile(null);
    if (iconFileInputRef.current) iconFileInputRef.current.value = "";
  };

  useEffect(() => {
    if (collabSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(collabSearch.trim());
        const pendingIds = new Set(pendingCollaborators.map((p) => p.userId));
        setSearchResults(results.filter((u) => !pendingIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [collabSearch, searchUsers, pendingCollaborators]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const moveStage = (index: number, dir: -1 | 1) => {
    setStageDrafts((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const addPendingCollaborator = (user: SearchUser, role: string) => {
    setPendingCollaborators((prev) => {
      if (prev.some((p) => p.userId === user.id)) return prev;
      return [
        ...prev,
        {
          userId: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          role,
        },
      ];
    });
    setCollabSearch("");
    setSearchResults([]);
  };

  const removePendingCollaborator = (userId: string) => {
    setPendingCollaborators((prev) => prev.filter((p) => p.userId !== userId));
  };

  const applyStagesAfterCreate = async (projectId: string, stagesFromApi: ProjectStage[]) => {
    if (!customizeStages || !stageDrafts.length) return;
    const sorted = [...stagesFromApi].sort((a, b) => a.position - b.position);
    const n = Math.min(sorted.length, stageDrafts.length);
    for (let i = 0; i < n; i++) {
      const name = stageDrafts[i].name.trim() || sorted[i].name;
      const color = stageDrafts[i].color || sorted[i].color || "#E2E8F0";
      await patchProjectStage(projectId, sorted[i].id, { name, color });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const colorHex = normalizeProjectColorHex(form.color);
    if (!colorHex) {
      setSubmitError("Cor inválida. Use #RGB ou #RRGGBB (ex: #eab308 ou #abc).");
      return;
    }

    const payload: CreateProjectData = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: PROJECT_STATUS.OPEN,
      methodology: form.methodology,
      default_view: form.default_view,
      properties: {
        color: colorHex,
      },
    };

    const created = await createProject(payload);

    if (!created?.id) {
      setSubmitError(contextError ?? "Não foi possível criar o projeto. Tente novamente.");
      return;
    }

    const projectId = created.id;
    setPostCreateBusy(true);
    try {
      if (iconFile) {
        try {
          const fd = new FormData();
          fd.append("icon", iconFile);
          await updateProject(projectId, fd);
        } catch (err) {
          console.error("Project icon upload failed:", err);
        }
      }

      let stagesList: ProjectStage[] = Array.isArray(created.stages)
        ? (created.stages as ProjectStage[])
        : [];
      if (!stagesList.length) {
        try {
          stagesList = await fetchProjectStages(projectId);
        } catch {
          stagesList = [];
        }
      }
      if (stagesList.length) {
        await applyStagesAfterCreate(projectId, stagesList);
      }

      for (const c of pendingCollaborators) {
        try {
          await postProjectCollaborator(projectId, { userId: c.userId, role: c.role });
        } catch (err) {
          console.error("Collaborator add failed:", c.userId, err);
        }
      }

      if (configureReports) {
        try {
          const channels =
            reportForm.channels?.length ? reportForm.channels : (["in_app"] as ("in_app" | "email")[]);
          await putProjectAiReportConfig(projectId, { ...reportForm, channels });
        } catch (err) {
          console.error("AI report config failed:", err);
        }
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      setSubmitError("Projeto criado, mas falhou ao aplicar algumas opções. Abra o projeto para concluir.");
      router.push(`/projects/${projectId}`);
    } finally {
      setPostCreateBusy(false);
    }
  };

  const displayError = submitError ?? contextError;
  const busy = loading || postCreateBusy;
  const defaultStages = stageDefaultsFor(form.methodology);

  return (
    <>
      <div className="w-full">
        <ApplicationPageNav
          aria-label="Novo projeto"
          leftContent={
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-100"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Voltar
            </button>
          }
        />
      </div>

      <div className="w-full p-2">
      <div className="mb-8">
        <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Novo projeto
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Defina o projeto, ajuste etapas se quiser, convide pessoas e opcionalmente ative relatórios — tudo nesta página, sem modais.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {displayError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {displayError}
          </div>
        )}

        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Informações básicas
          </h2>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <label htmlFor="proj-title" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                id="proj-title"
                type="text"
                required
                maxLength={100}
                placeholder="Ex: Redesign do App, Lançamento Q3..."
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proj-description" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descrição
              </label>
              <textarea
                id="proj-description"
                rows={3}
                maxLength={500}
                placeholder="Qual o objetivo deste projeto?"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-400">Metodologia</h2>
          <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-500">
            Define as etapas iniciais do quadro. Pode renomeá-las na secção seguinte.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {METHODOLOGY_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setField("methodology", m.id!)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition ${
                  form.methodology === m.id
                    ? "border-brand-primary-500 bg-brand-primary-500/5 ring-1 ring-brand-primary-500"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                }`}
              >
                <span
                  className={`mt-0.5 rounded-md p-1.5 ${
                    form.methodology === m.id
                      ? "bg-brand-primary-500 text-neutral-950"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  {m.icon}
                </span>
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="mt-0.5 text-xs text-neutral-500">{m.description}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-400">Visualização padrão</h2>
          <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-500">
            Como as tarefas serão exibidas ao abrir o projeto.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setField("default_view", v.id!)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition ${
                  form.default_view === v.id
                    ? "border-brand-primary-500 bg-brand-primary-500/5 ring-1 ring-brand-primary-500"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                }`}
              >
                <span
                  className={`mt-0.5 rounded-md p-1.5 ${
                    form.default_view === v.id
                      ? "bg-brand-primary-500 text-neutral-950"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  {v.icon}
                </span>
                <div>
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="mt-0.5 text-xs text-neutral-500">{v.description}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Personalização</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="project-color-native" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Cor do projeto
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Escolha no seletor ou escreva o código hex (#RGB ou #RRGGBB).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="project-color-native"
                  type="color"
                  aria-label="Escolher cor"
                  value={hexForColorInput(form.color, "#eab308")}
                  onChange={(e) => setField("color", e.target.value.toLowerCase())}
                  className="h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800"
                />
                <input
                  id="project-color-hex"
                  type="text"
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  onBlur={() => {
                    const n = normalizeProjectColorHex(form.color);
                    if (n) setField("color", n);
                  }}
                  placeholder="#eab308"
                  maxLength={7}
                  spellCheck={false}
                  className="min-w-[7.5rem] flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 font-mono text-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700"
                  style={{ backgroundColor: hexForColorInput(form.color, "#eab308") }}
                  aria-hidden
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Ícone do projeto
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Imagem guardada no storage. Formato JSON:{" "}
                <code className="rounded-md bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
                  name, path, type, size
                </code>
              </p>
              <input
                ref={iconFileInputRef}
                type="file"
                accept={ICON_ACCEPT}
                className="sr-only"
                id="project-icon-upload"
                onChange={(e) => onPickIconFile(e.target.files)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                  {iconPreviewUrl ? (
                    <Image
                      src={iconPreviewUrl}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-neutral-400" aria-hidden />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => iconFileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Escolher imagem
                  </button>
                  {iconFile && (
                    <button
                      type="button"
                      onClick={clearIconFile}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
              {iconFile && (
                <p className="truncate text-xs text-neutral-500" title={iconFile.name}>
                  {iconFile.name} · {(iconFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Etapas (inline) */}
        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Etapas do quadro</h2>
              <p className="mt-1 max-w-xl text-xs text-neutral-500 dark:text-neutral-500">
                Por omissão usamos as colunas da metodologia. Ative para editar nomes e cores antes de criar.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-start rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={customizeStages}
                onChange={(e) => {
                  const on = e.target.checked;
                  setCustomizeStages(on);
                  if (on) setStageDrafts(stageDefaultsFor(form.methodology));
                }}
                className="rounded-md border-neutral-300 text-brand-primary-500 focus:ring-brand-primary-500/30"
              />
              Personalizar etapas
            </label>
          </div>

          {!customizeStages && (
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
              {defaultStages.map((s, i) => (
                <li key={i} className="flex items-center gap-2 px-2 py-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-neutral-800 dark:text-neutral-100">{s.name}</span>
                </li>
              ))}
            </ul>
          )}

          {customizeStages && (
            <div className="space-y-2">
              {stageDrafts.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-md border border-neutral-100 bg-neutral-50/80 p-2 sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  <div className="flex items-center gap-1 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStage(i, -1)}
                      disabled={i === 0}
                      className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                      aria-label="Mover etapa para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(i, 1)}
                      disabled={i === stageDrafts.length - 1}
                      className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                      aria-label="Mover etapa para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) =>
                      setStageDrafts((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r))
                      )
                    }
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    placeholder="Nome da coluna"
                  />
                  <input
                    type="text"
                    value={row.color}
                    onChange={(e) =>
                      setStageDrafts((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, color: e.target.value } : r))
                      )
                    }
                    className="w-full rounded-md border border-neutral-200 bg-white px-2 py-2 font-mono text-xs sm:w-28 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    placeholder="#hex"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pessoas (inline) */}
        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-4 flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-neutral-400" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Pessoas</h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                Pesquise por nome ou email e adicione à lista. Os convites são enviados após criar o projeto.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label htmlFor="collab-search" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Procurar
                </label>
                <input
                  id="collab-search"
                  type="text"
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  placeholder="Nome ou email (mín. 2 caracteres)…"
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1.5 sm:w-44">
                <label htmlFor="invite-role" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Papel ao adicionar
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  {COLLAB_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {collabSearch.trim().length >= 2 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-neutral-100 bg-neutral-50/90 dark:border-neutral-800 dark:bg-neutral-950/50">
                {searchingUsers ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> A procurar…
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="py-2 text-center text-xs text-neutral-500">Nenhum resultado.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {searchResults.map((user) => (
                      <li
                        key={user.id}
                        className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {user.avatar_url ? (
                            <Image
                              src={getStorageUrl(user.avatar_url)}
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                              {(user.name || user.username || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {user.name || user.username}
                            </div>
                            <div className="truncate text-xs text-neutral-500">{user.email}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addPendingCollaborator(user, inviteRole)}
                          className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-brand-primary-500 px-2 py-2 text-xs font-semibold text-neutral-900 hover:brightness-95 sm:self-center"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {pendingCollaborators.length > 0 && (
              <ul className="space-y-2 rounded-md border border-neutral-100 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/40">
                {pendingCollaborators.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between gap-2 rounded-md border border-neutral-50 px-2 py-2 dark:border-neutral-800"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {p.avatar_url ? (
                        <Image
                          src={getStorageUrl(p.avatar_url)}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-200 text-xs font-semibold dark:bg-neutral-700">
                          {(p.name || p.username).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name || p.username}</div>
                        <div className="text-xs text-neutral-500">{COLLAB_ROLES.find((r) => r.value === p.role)?.label ?? p.role}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingCollaborator(p.userId)}
                      className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Relatórios + IA (inline, sem modais) */}
        <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mb-4 flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-4 w-4 text-neutral-400" />
            <div className="flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Relatórios &amp; lembretes</h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                Opcional: configura relatórios de sprint e canais após a criação do projeto.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={configureReports}
                onChange={(e) => setConfigureReports(e.target.checked)}
                className="rounded-md border-neutral-300 text-brand-primary-500 focus:ring-brand-primary-500/30"
              />
              Ativar
            </label>
          </div>

          {configureReports && (
            <div className="grid grid-cols-1 gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Hora (UTC)</label>
                <input
                  type="text"
                  value={reportForm.report_time_utc ?? "09:00"}
                  onChange={(e) =>
                    setReportForm((f) => ({ ...f, report_time_utc: e.target.value }))
                  }
                  placeholder="HH:mm"
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Duração sprint (dias)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={reportForm.default_sprint_duration_days ?? 14}
                  onChange={(e) =>
                    setReportForm((f) => ({
                      ...f,
                      default_sprint_duration_days: Number(e.target.value) || 14,
                    }))
                  }
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Canais</span>
                <div className="flex flex-wrap gap-2">
                  {(["in_app", "email"] as const).map((ch) => (
                    <label key={ch} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={(reportForm.channels ?? []).includes(ch)}
                        onChange={(e) => {
                          const cur = new Set(reportForm.channels ?? []);
                          if (e.target.checked) cur.add(ch);
                          else cur.delete(ch);
                          setReportForm((f) => ({ ...f, channels: Array.from(cur) as ("in_app" | "email")[] }));
                        }}
                        className="rounded-md border-neutral-300 text-brand-primary-500"
                      />
                      {ch === "in_app" ? "Na app" : "Email"}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="report-recipients"
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Destinatários
                </label>
                <select
                  id="report-recipients"
                  value={reportForm.recipient_scope ?? "all_members"}
                  onChange={(e) =>
                    setReportForm((f) => ({
                      ...f,
                      recipient_scope: e.target.value as AiReportConfigUpsertPayload["recipient_scope"],
                    }))
                  }
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="owner_only">Apenas dono</option>
                  <option value="all_members">Todos os membros</option>
                  <option value="custom">Personalizado (avançado)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                {(
                  [
                    ["enable_sprint_kickoff", "Kickoff de sprint"],
                    ["enable_daily_standup", "Daily standup"],
                    ["enable_sprint_review", "Review de sprint"],
                    ["auto_create_next_sprint", "Criar próxima sprint automaticamente"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={Boolean(reportForm[key])}
                      onChange={(e) => setReportForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="rounded-md border-neutral-300 text-brand-primary-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">IA no projeto:</span>{" "}
              chat, análises e agentes ficam disponíveis no projeto após criar — use o assistente no contexto das notas e tarefas para melhores resultados.
            </p>
          </div>
        </section>

        {form.title && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-neutral-300 p-2 text-sm dark:border-neutral-700">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
              {iconPreviewUrl ? (
                <Image
                  src={iconPreviewUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-neutral-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: hexForColorInput(form.color, "#eab308") }}
              />
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{form.title}</span>
            </div>
            <span className="ml-auto rounded-md border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
              {form.methodology} · {form.default_view}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="rounded-md px-2 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !form.title.trim()}
            className="flex items-center gap-2 rounded-md bg-brand-primary-500 px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : postCreateBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading ? "A criar…" : postCreateBusy ? "A guardar…" : "Criar projeto"}
          </button>
        </div>
      </form>
      </div>
    </>
  );
}
