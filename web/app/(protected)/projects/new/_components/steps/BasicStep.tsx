"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LayoutGrid, Trello, Upload, ImageIcon, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";
import type { CreateProjectData } from "@/app/_services/projects-service/projects-service";
import type { CreateProjectWizardStepProps } from "@/app/(protected)/projects/new/_components/create-project-wizard.types";

const ICON_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
const MAX_ICON_BYTES = 2 * 1024 * 1024;

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

export function BasicStep({ state, actions }: CreateProjectWizardStepProps) {
  const { createProject, updateProject, loading, error: contextError } = useProjects();

  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.draft.iconFile) {
      setIconPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(state.draft.iconFile);
    setIconPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.draft.iconFile]);

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
    actions.setIconFile(file);
  };

  const clearIconFile = () => {
    actions.setIconFile(null);
    if (iconFileInputRef.current) iconFileInputRef.current.value = "";
  };

  const displayError = submitError ?? contextError;
  const hasCreated = Boolean(state.created.projectId);

  const canCreate = useMemo(() => {
    return Boolean(state.draft.basic.title.trim()) && !hasCreated && !busy && !loading;
  }, [busy, hasCreated, loading, state.draft.basic.title]);

  const handleCreate = async () => {
    setSubmitError(null);

    const colorHex = normalizeProjectColorHex(state.draft.basic.color);
    if (!colorHex) {
      setSubmitError("Cor inválida. Use #RGB ou #RRGGBB (ex: #eab308 ou #abc).");
      return;
    }

    setBusy(true);
    try {
      const payload: CreateProjectData = {
        title: state.draft.basic.title.trim(),
        description: state.draft.basic.description.trim() || undefined,
        status: PROJECT_STATUS.OPEN,
        methodology: state.draft.basic.methodology,
        properties: {
          color: colorHex,
        },
      };

      const created = await createProject(payload);
      if (!created?.id) {
        setSubmitError(contextError ?? "Não foi possível criar o projeto. Tente novamente.");
        return;
      }

      actions.setCreatedProject(created);

      if (state.draft.iconFile) {
        actions.setSetupStatus("icon", "running");
        try {
          const fd = new FormData();
          fd.append("icon", state.draft.iconFile);
          await updateProject(created.id, fd);
          actions.setSetupStatus("icon", "done");
        } catch (err) {
          console.error("Project icon upload failed:", err);
          actions.setSetupStatus(
            "icon",
            "error",
            "Falhou ao enviar ícone. Pode configurar mais tarde."
          );
        }
      }

      actions.goToStep("stages");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
      <h2 className="mb-4 text-xs font-bold tracking-wider text-neutral-400 uppercase">
        Informações básicas
      </h2>

      {displayError && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {displayError}
        </div>
      )}

      <div className="space-y-2">
        <div className="space-y-1.5">
          <label
            htmlFor="proj-title"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="proj-title"
            type="text"
            required
            maxLength={100}
            placeholder="Ex: Redesign do App, Lançamento Q3..."
            value={state.draft.basic.title}
            onChange={(e) => actions.setBasicDraft("title", e.target.value)}
            className="focus:border-brand-primary-500 focus:ring-brand-primary-500/20 dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm transition outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="proj-description"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Descrição
          </label>
          <textarea
            id="proj-description"
            rows={3}
            maxLength={500}
            placeholder="Qual o objetivo deste projeto?"
            value={state.draft.basic.description}
            onChange={(e) => actions.setBasicDraft("description", e.target.value)}
            className="focus:border-brand-primary-500 focus:ring-brand-primary-500/20 dark:border-surface-dark-border-strong w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm transition outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/30">
          <h3 className="mb-1 text-xs font-bold tracking-wider text-neutral-400 uppercase">
            Metodologia
          </h3>
          <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-500">
            Define as etapas iniciais do quadro. Pode renomeá-las a seguir.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {METHODOLOGY_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => actions.setBasicDraft("methodology", m.id!)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition ${
                  state.draft.basic.methodology === m.id
                    ? "border-brand-primary-500 bg-brand-primary-500/5 ring-brand-primary-500 ring-1"
                    : "dark:border-surface-dark-border-strong border-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600"
                }`}
              >
                <span
                  className={`mt-0.5 rounded-md p-1.5 ${
                    state.draft.basic.methodology === m.id
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
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="dark:border-surface-dark-border space-y-2 rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/30">
            <label
              htmlFor="project-color-native"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
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
                value={hexForColorInput(state.draft.basic.color, "#eab308")}
                onChange={(e) => actions.setBasicDraft("color", e.target.value.toLowerCase())}
                className="dark:border-surface-dark-border-strong h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 p-1 dark:bg-neutral-800"
              />
              <input
                id="project-color-hex"
                type="text"
                value={state.draft.basic.color}
                onChange={(e) => actions.setBasicDraft("color", e.target.value)}
                onBlur={() => {
                  const n = normalizeProjectColorHex(state.draft.basic.color);
                  if (n) actions.setBasicDraft("color", n);
                }}
                placeholder="#eab308"
                maxLength={7}
                spellCheck={false}
                className="focus:border-brand-primary-500 focus:ring-brand-primary-500/20 dark:border-surface-dark-border-strong min-w-[7.5rem] flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 font-mono text-sm transition outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <span
                className="dark:border-surface-dark-border-strong h-9 w-9 shrink-0 rounded-md border border-neutral-200"
                style={{ backgroundColor: hexForColorInput(state.draft.basic.color, "#eab308") }}
                aria-hidden
              />
            </div>
          </div>

          <div className="dark:border-surface-dark-border space-y-2 rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/30">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Ícone do projeto
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Imagem guardada no storage.
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
              <div className="dark:border-surface-dark-border-strong flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:bg-neutral-800">
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
                  className="dark:border-surface-dark-border-muted inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Escolher imagem
                </button>
                {state.draft.iconFile && (
                  <button
                    type="button"
                    onClick={clearIconFile}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remover
                  </button>
                )}
              </div>
            </div>
            {state.draft.iconFile && (
              <p className="truncate text-xs text-neutral-500" title={state.draft.iconFile.name}>
                {state.draft.iconFile.name} · {(state.draft.iconFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>

        <div className="dark:border-surface-dark-border flex items-center justify-end gap-2 border-t border-neutral-200 pt-2">
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            className="bg-brand-primary-500 flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {hasCreated ? "Projeto criado" : busy || loading ? "A criar…" : "Criar projeto"}
          </button>
        </div>
      </div>
    </section>
  );
}
