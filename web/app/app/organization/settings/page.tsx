"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import {
  fetchOrganizationMembers,
  type OrganizationMember,
  type OrganizationProperties,
} from "@/app/_services/organization";
import {
  Building2,
  Settings,
  Plus,
  Edit3,
  Save,
  X,
  ShieldAlert,
  Activity,
  Layers,
  Camera,
  Globe,
  Palette,
  Bell,
  Clock,
  Languages,
  Moon,
  UserCog,
  CheckCircle2,
  LayoutDashboard,
  Trash2,
  RefreshCw,
} from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { OrganizationHeader } from "@/app/app/_components/ui/headers/organization-header";

// --- Components ---

const Badge = ({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) => {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${colors[color] || colors.zinc}`}
    >
      {children}
    </span>
  );
};

const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex flex-col">
      <span
        className={`text-sm font-medium ${disabled ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
      >
        {label}
      </span>
      {description && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
      )}
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:outline-none dark:focus:ring-zinc-600 dark:focus:ring-offset-zinc-900 ${
        checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const Select = ({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  label: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  </div>
);

const Input = ({
  value,
  onChange,
  type = "text",
  label,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
    />
  </div>
);

const ImageEditModal = ({
  isOpen,
  onClose,
  onSave,
  title,
  currentUrl,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
  title: string;
  currentUrl: string;
  loading: boolean;
}) => {
  const [url, setUrl] = useState(currentUrl);

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm duration-200">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-neutral-50 p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <div className="mb-4 flex h-32 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          {url ? (
            <img
              src={url}
              alt="Preview"
              className="h-full w-full rounded-md object-contain object-center p-2"
            />
          ) : (
            <div className="flex flex-col items-center text-zinc-400">
              <Camera className="mb-2 h-6 w-6" />
              <span className="text-xs">Preview</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">URL da Imagem</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(url)}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? (
                <Activity className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrganizationPage = () => {
  const { user } = useAuth();
  const {
    organization,
    loading,
    hasOrganization,
    getStats,
    isOwner,
    createOrganization,
    updateOrganization,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
  } = useOrganization();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingImage, setEditingImage] = useState<"logo" | "banner" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states matching Organization interface data
  const [formData, setFormData] = useState({
    org_name: "",
    description: "",
    unique_name: "",
  });

  // Local properties state for immediate UI feedback before saving
  const [localProps, setLocalProps] = useState<OrganizationProperties>({});

  useEffect(() => {
    if (organization) {
      setFormData({
        org_name: organization.org_name || "",
        description: organization.description || "",
        unique_name: organization.unique_name || "",
      });
      setLocalProps(organization.properties || {});
    }
  }, [organization]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  // --- Handlers ---

  const handleCreateOrganization = async () => {
    setIsCreating(true);
    // Simple placeholder creation logic if needed, usually redirects to a creation page or opens a modal
    // For now we assume a separate flow or simple creation here
    try {
      await createOrganization({
        org_name: "Nova Organização",
        description: "Minha nova organização no Weave Notes",
      });
      toast.success("Organização criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar organização");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      await updateOrganization({
        org_name: formData.org_name,
        description: formData.description,
        unique_name: formData.unique_name,
      });
      toast.success("Informações atualizadas com sucesso");
      setIsEditingInfo(false);
    } catch (error) {
      toast.error("Erro ao atualizar informações");
    }
  };

  const handleUpdateImage = async (url: string) => {
    if (!editingImage) return;

    try {
      await updateOrganization({
        [editingImage === "logo" ? "logo_url" : "banner_url"]: url,
      });
      toast.success(`${editingImage === "logo" ? "Logo" : "Banner"} atualizado com sucesso`);
      setEditingImage(null);
    } catch (error) {
      toast.error("Erro ao atualizar imagem");
    }
  };

  const handlePropertyChange = async (
    section: keyof OrganizationProperties,
    key: string | null, // key within the section, or null if the section is a direct value
    value: any
  ) => {
    if (!organization) return;

    const currentProps = { ...organization.properties };
    let newProps = { ...currentProps };

    if (key && typeof newProps[section] === "object") {
      // Nested update (e.g. features.aiAgent)
      newProps = {
        ...newProps,
        [section]: {
          ...((newProps[section] as object) || {}),
          [key]: value,
        },
      };
    } else {
      // Direct update (e.g. theme)
      newProps = {
        ...newProps,
        [section]: value,
      };
    }

    // Optimistic UI update
    setLocalProps(newProps);

    try {
      await updateProperties(newProps);
      toast.success("Configuração salva");
    } catch (error) {
      // Revert on error
      setLocalProps(currentProps);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleDeleteOrganization = async () => {
    if (
      !confirm(
        "Tem certeza absoluta? Esta ação não pode ser desfeita imediatamente (embora exista restauração por 30 dias)."
      )
    )
      return;

    setIsDeleting(true);
    try {
      const success = await deleteOrganization();
      if (success) {
        toast.success("Organização deletada");
        // Redirect or show deleted state
        router.refresh();
      } else {
        toast.error("Falha ao deletar organização");
      }
    } catch (error) {
      toast.error("Erro ao deletar organização");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreOrganization = async () => {
    try {
      await restoreOrganization();
      toast.success("Organização restaurada com sucesso!");
    } catch (error) {
      toast.error("Erro ao restaurar organização");
    }
  };

  // --- CREATE SCREEN ---
  if (!hasOrganization && !organization?.deleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-50 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <Building2 className="h-10 w-10 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Bem-vindo ao Weave
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-zinc-500">
            Crie sua primeira organização para começar a gerenciar projetos e colaborar com sua
            equipe.
          </p>
          <button
            onClick={handleCreateOrganization}
            disabled={isCreating}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isCreating ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar Organização
          </button>
        </div>
      </div>
    );
  }

  // --- DELETED STATE ---
  if (organization?.deleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Organização Deletada
        </h1>
        <p className="mt-2 text-zinc-500">
          Esta organização está marcada para exclusão definitiva em 30 dias.
        </p>
        <button
          onClick={handleRestoreOrganization}
          className="mt-6 flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <RefreshCw className="h-4 w-4" /> Restaurar Organização
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in animate-in min-h-screen space-y-8 pb-20 duration-500">
      <OrganizationHeader />

      {/* 1. Header & Identity */}
      <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Banner */}
        <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-900">
          {organization?.banner_url ? (
            <img
              src={organization.banner_url}
              alt="Banner"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-zinc-200 to-zinc-100 opacity-50 dark:from-zinc-900 dark:to-zinc-950" />
          )}
          {userIsOwner && (
            <button
              onClick={() => setEditingImage("banner")}
              className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:bg-black/60"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Info Content */}
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 flex items-end justify-between">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-xl border-4 border-white bg-zinc-50 shadow-md dark:border-zinc-950 dark:bg-zinc-900">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
              </div>
              {userIsOwner && (
                <button
                  onClick={() => setEditingImage("logo")}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100"
                >
                  <Camera className="h-6 w-6" />
                </button>
              )}
            </div>

            <div className="mb-1 flex gap-2">
              {userIsOwner && (
                <button
                  onClick={() => setIsEditingInfo(true)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Detalhes
                </button>
              )}
            </div>
          </div>

          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
              {organization?.org_name}
              {organization?.unique_name && (
                <span className="text-sm font-normal text-zinc-400">
                  @{organization.unique_name}
                </span>
              )}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              {organization?.description || "Sem descrição definida."}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-900 dark:text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Criado em{" "}
                {organization?.created_at
                  ? new Date(organization.created_at).toLocaleDateString()
                  : "-"}
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {organization?.org_domains?.length || 0} domínios
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* LEFT COLUMN - Settings Forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* General Settings */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Settings className="h-5 w-5 text-zinc-500" />
              Configurações Gerais
            </h2>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Idioma Padrão"
                  value={localProps.language || "pt-BR"}
                  onChange={(v) => handlePropertyChange("language", null, v)}
                  options={[
                    { label: "Português (Brasil)", value: "pt-BR" },
                    { label: "English (US)", value: "en-US" },
                    { label: "Español", value: "es" },
                  ]}
                  disabled={!userIsOwner}
                />
                <Select
                  label="Fuso Horário"
                  value={localProps.timezone || "America/Sao_Paulo"}
                  onChange={(v) => handlePropertyChange("timezone", null, v)}
                  options={[
                    { label: "Brasília (GMT-3)", value: "America/Sao_Paulo" },
                    { label: "UTC", value: "UTC" },
                    { label: "New York (EST)", value: "America/New_York" },
                    { label: "London (GMT)", value: "Europe/London" },
                  ]}
                  disabled={!userIsOwner}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Tema da Organização"
                  value={localProps.theme || "auto"}
                  onChange={(v) => handlePropertyChange("theme", null, v)}
                  options={[
                    { label: "Automático (Sistema)", value: "auto" },
                    { label: "Claro", value: "light" },
                    { label: "Escuro", value: "dark" },
                  ]}
                  disabled={!userIsOwner}
                />
              </div>

              <div className="border-t border-zinc-100 pt-4 dark:border-zinc-900">
                <Toggle
                  label="Permitir Notas Públicas"
                  description="Membros podem criar notas acessíveis via link público"
                  checked={localProps?.allowPublicNotes || false}
                  onChange={(v) => handlePropertyChange("allowPublicNotes", null, v)}
                  disabled={!userIsOwner}
                />
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Bell className="h-5 w-5 text-zinc-500" />
              Notificações
            </h2>
            <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-900">
              <Toggle
                label="Notificações por Email"
                description="Receber emails sobre atividades importantes"
                checked={localProps?.notifications?.email || false}
                onChange={(v) => handlePropertyChange("notifications", "email", v)}
                disabled={!userIsOwner}
              />
              <Toggle
                label="Notificações Push"
                description="Receber alertas no navegador"
                checked={localProps?.notifications?.push || false}
                onChange={(v) => handlePropertyChange("notifications", "push", v)}
                disabled={!userIsOwner}
              />
              <div className="pt-4">
                <Select
                  label="Resumo de Atividades (Digest)"
                  value={localProps?.notifications?.digest || "weekly"}
                  onChange={(v) => handlePropertyChange("notifications", "digest", v)}
                  options={[
                    { label: "Diário", value: "daily" },
                    { label: "Semanal", value: "weekly" },
                    { label: "Mensal", value: "monthly" },
                  ]}
                  disabled={!userIsOwner}
                />
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Layers className="h-5 w-5 text-zinc-500" />
              Funcionalidades
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50">
                <Toggle
                  label="Assistente de IA"
                  description="Habilita recursos de inteligência artificial para notas"
                  checked={localProps?.features?.aiAgent || false}
                  onChange={(v) => handlePropertyChange("features", "aiAgent", v)}
                  disabled={!userIsOwner}
                />
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50">
                <Toggle
                  label="Backup Automático"
                  description="Realiza backup diário de todas as notas"
                  checked={localProps?.features?.backup || false}
                  onChange={(v) => handlePropertyChange("features", "backup", v)}
                  disabled={!userIsOwner}
                />
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50">
                <Toggle
                  label="Colaboração em Tempo Real"
                  description="Permite edição simultânea em notas"
                  checked={localProps?.features?.collaboration || false}
                  onChange={(v) => handlePropertyChange("features", "collaboration", v)}
                  disabled={!userIsOwner}
                />
              </div>
            </div>
          </section>

          {/* Branding */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Palette className="h-5 w-5 text-zinc-500" />
              Identidade Visual
            </h2>
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Cor Primária
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localProps?.branding?.primaryColor || "#000000"}
                      onChange={(e) =>
                        handlePropertyChange("branding", "primaryColor", e.target.value)
                      }
                      disabled={!userIsOwner}
                      className="h-10 w-14 cursor-pointer rounded border border-zinc-200 p-1 dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                      {localProps?.branding?.primaryColor || "#000000"}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Cor Secundária
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localProps?.branding?.secondaryColor || "#ffffff"}
                      onChange={(e) =>
                        handlePropertyChange("branding", "secondaryColor", e.target.value)
                      }
                      disabled={!userIsOwner}
                      className="h-10 w-14 cursor-pointer rounded border border-zinc-200 p-1 dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                      {localProps?.branding?.secondaryColor || "#ffffff"}
                    </div>
                  </div>
                </div>
              </div>
              <Input
                label="Domínio Personalizado (CNAME)"
                value={localProps?.branding?.customDomain || ""}
                onChange={(v) => handlePropertyChange("branding", "customDomain", v)}
                placeholder="docs.example.com"
                disabled={!userIsOwner}
              />
            </div>
          </section>

          {/* Danger Zone */}
          {userIsOwner && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/10">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-100">
                <ShieldAlert className="h-5 w-5" />
                Zona de Perigo
              </h2>
              <p className="mb-6 text-sm text-red-700 dark:text-red-300">
                Ações nesta área podem ser irreversíveis ou causar perda de dados temporária.
              </p>

              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-zinc-900">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Deletar Organização
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Isso marcará a organização para exclusão em 30 dias.
                  </p>
                </div>
                <button
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting}
                  className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deletando..." : "Deletar"}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN - Stats & Overview */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Total de Membros</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.totalMembers}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Projetos Ativos</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.totalProjects}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Admins</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.totalAdmins}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Recursos Ativos</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.featuresEnabled}
                </span>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <Activity className="h-4 w-4" />
              Limites & Uso
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-zinc-500">Membros</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {stats.totalMembers} / {localProps.maxMembers || 50}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{
                      width: `${Math.min((stats.totalMembers / (localProps.maxMembers || 50)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-zinc-500">Projetos</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {stats.totalProjects} / {localProps.maxProjects || 100}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{
                      width: `${Math.min((stats.totalProjects / (localProps.maxProjects || 100)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <UserCog className="h-4 w-4" />
              Proprietário
            </h3>
            {organization?.owner ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-zinc-100">
                  {organization.owner.avatar_url ? (
                    <img
                      src={getStorageUrl(organization.owner.avatar_url)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <UserCog className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {organization.owner.name}
                  </p>
                  <p className="text-xs text-zinc-500">@{organization.owner.username}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Informações indisponíveis</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditingInfo && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar Informações</h2>
              <button
                onClick={() => setIsEditingInfo(false)}
                className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <Input
                label="Nome da Organização"
                value={formData.org_name}
                onChange={(v) => setFormData({ ...formData, org_name: v })}
                placeholder="Ex: Acme Corp"
              />
              <Input
                label="Identificador Único (slug)"
                value={formData.unique_name}
                onChange={(v) => setFormData({ ...formData, unique_name: v })}
                placeholder="Ex: acme-corp"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Descrição
                </label>
                <textarea
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Uma breve descrição sobre a organização..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageEditModal
        isOpen={!!editingImage}
        title={editingImage === "logo" ? "Editar Logo" : "Editar Banner"}
        currentUrl={
          editingImage === "logo" ? organization?.logo_url || "" : organization?.banner_url || ""
        }
        onClose={() => setEditingImage(null)}
        onSave={handleUpdateImage}
        loading={loading}
      />
    </div>
  );
};

export default OrganizationPage;
