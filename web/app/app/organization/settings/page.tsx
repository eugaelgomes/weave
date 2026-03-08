"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { fetchOrganizationMembers, type OrganizationMember } from "@/app/_services/organization";
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
} from "lucide-react";

const Badge = ({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) => {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${colors[color] || colors.zinc}`}
    >
      {children}
    </span>
  );
};

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
  const { organization, loading, hasOrganization, getStats, isOwner } = useOrganization();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingImage, setEditingImage] = useState<"logo" | "banner" | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Tab state removed here

  // Form states
  const [formData, setFormData] = useState({
    org_name: "",
    description: "",
    logo_url: "",
    banner_url: "",
  });

  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member">("member");

  useEffect(() => {
    const loadMembers = async () => {
      if (!organization?.id) return;
      setLoadingMembers(true);
      try {
        const data = await fetchOrganizationMembers();
        setMembers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMembers(false);
      }
    };
    if (hasOrganization) loadMembers();
  }, [organization?.id, hasOrganization]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;
  const userCanManage =
    userIsOwner || members.find((m) => m.id === user?.id)?.membership.role === "admin";

  // ... Handlers
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingInfo(false);
  };

  const handleUpdateImage = async (url: string) => {
    setEditingImage(null);
  };
  const handleToggleFeature = async (feature: string) => {};
  const handleDeleteOrganization = async () => {};

  // --- CREATE SCREEN ---
  if (!hasOrganization && !isCreating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="text-center">
          <div className="rounded-mdxl mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-neutral-50 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <Building2 className="h-8 w-8 text-zinc-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Bem-vindo ao Weave</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
            Crie sua primeira organização para começar a gerenciar projetos.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Plus className="h-4 w-4" /> Criar Organização
          </button>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return <div className="flex h-screen items-center justify-center">Criando...</div>;
  }

  return (
    <div className="min-h-screen rounded-md bg-neutral-50 pb-12 dark:bg-neutral-950">
      {/* 1. Header & Banner */}
      <div className="rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Banner Area */}
        <div className="group relative h-60 w-full overflow-hidden rounded-t-md bg-neutral-50 dark:bg-neutral-900">
          {organization?.banner_url ? (
            <img
              src={organization.banner_url}
              alt="Banner"
              className="h-full w-full rounded-t-md object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-200 via-zinc-100 to-white opacity-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950" />
          )}
          {userIsOwner && (
            <button
              onClick={() => setEditingImage("banner")}
              className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative -mt-10 flex flex-col items-start gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Logo Wrapper */}
            <div className="group relative">
              <div className="h-30 w-30 overflow-hidden rounded-md border-2 border-white bg-neutral-50 shadow-md dark:border-neutral-900 dark:bg-neutral-900">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              {userIsOwner && (
                <button
                  onClick={() => setEditingImage("logo")}
                  className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            {/* Title & Actions */}
            <div className="flex w-full flex-1 items-end justify-between">
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {organization?.org_name || "Minha Organização"}
                  </h1>
                  {userIsOwner && (
                    <button
                      onClick={() => {
                        setIsEditingInfo(true);
                        setFormData({
                          ...formData,
                          org_name: organization?.org_name || "",
                          description: organization?.description || "",
                        });
                      }}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  @{organization?.unique_name || "org-id"}
                </p>
              </div>

              {/* TABS BUTTONS REMOVED HERE */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - UNIFIED VIEW */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Description Section */}
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-neutral-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Building2 className="h-4 w-4 text-zinc-500" />
              Sobre a {organization?.org_name || "organização"}
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {organization?.description || (
                <span className="text-zinc-400 italic">Nenhuma descrição fornecida.</span>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Criado em{" "}
                {organization?.created_at
                  ? new Date(organization.created_at).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Atualizado em{" "}
                {organization?.updated_at
                  ? new Date(organization.updated_at).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" />
                {organization?.properties?.language || "pt-BR"}
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {organization?.properties?.timezone || "America/Sao_Paulo"}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Visão Geral */}
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-neutral-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
              <LayoutDashboard className="h-5 w-5 text-zinc-500" />
              Visão Geral
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Coluna Esquerda: Stats & Info (2/3) */}
              <div className="space-y-6 lg:col-span-2">
                {/* Mini Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Projetos", value: stats.totalProjects, icon: Layers },
                    { label: "Recursos", value: stats.featuresEnabled, icon: Activity },
                    {
                      label: "Domínios",
                      value: organization?.org_domains?.length || 0,
                      icon: Globe,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="flex h-24 flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30"
                    >
                      <div className="flex items-center justify-between text-zinc-500">
                        <span className="text-xs font-medium uppercase">{stat.label}</span>
                        <stat.icon className="h-4 w-4 opacity-50" />
                      </div>
                      <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {loading ? "-" : stat.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Branding Colors (Visual Compacto) */}
                {organization?.properties?.branding && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-800/30">
                    <div className="mb-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        <Palette className="h-4 w-4 text-zinc-500" />
                        Identidade Visual
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="space-y-1">
                        <div
                          className="h-8 w-full rounded-md border border-zinc-200 shadow-sm"
                          style={{ backgroundColor: organization.properties.branding.primaryColor }}
                        />
                        <p className="font-mono text-xs text-zinc-500">
                          {organization.properties.branding.primaryColor}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div
                          className="h-8 w-full rounded-md border border-zinc-200 shadow-sm"
                          style={{
                            backgroundColor: organization.properties.branding.secondaryColor,
                          }}
                        />
                        <p className="font-mono text-xs text-zinc-500">
                          {organization.properties.branding.secondaryColor}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Status & Limites (1/3) */}
              <div className="space-y-6">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-800/30">
                  <div className="mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <UserCog className="h-4 w-4 text-zinc-500" />
                      Limites do Plano
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-zinc-500">Projetos</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {stats.totalProjects} / {organization?.properties?.maxProjects || 5}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                          style={{
                            width: `${(stats.totalProjects / (organization?.properties?.maxProjects || 5)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Domínios - Lista Compacta */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-800/30">
                  <div className="mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <Globe className="h-4 w-4 text-zinc-500" />
                      Domínios
                    </h3>
                  </div>
                  <div>
                    {organization?.org_domains && organization.org_domains.length > 0 ? (
                      <div className="space-y-2">
                        {organization.org_domains.map((domain, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {domain}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Nenhum domínio configurado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Configurações */}
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-neutral-50 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
                <Settings className="h-5 w-5 text-zinc-500" />
                Configurações
              </h2>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Features Toggles */}
              <div className="h-fit rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-800/30">
                <div className="mb-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <Layers className="h-4 w-4 text-zinc-500" />
                    Funcionalidades
                  </h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(organization?.properties?.features || {}).map(
                    ([feature, enabled]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-700 capitalize dark:text-zinc-200">
                            {feature}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Habilitar acesso a este módulo.
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleFeature(feature)}
                          disabled={!userIsOwner}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-50 transition-transform ${enabled ? "translate-x-4" : "translate-x-1"}`}
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Preferências */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-800/30">
                  <div className="mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <Settings className="h-4 w-4 text-zinc-500" />
                      Preferências do Sistema
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Moon className="h-4 w-4" /> Tema Padrão
                      </span>
                      <span className="font-medium text-zinc-900 capitalize dark:text-zinc-100">
                        {organization?.properties?.theme || "auto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Globe className="h-4 w-4" /> Notas Públicas
                      </span>
                      <span
                        className={`font-medium ${organization?.properties?.allowPublicNotes ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}
                      >
                        {organization?.properties?.allowPublicNotes ? "Permitido" : "Desabilitado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Bell className="h-4 w-4" /> Notificações por Email
                      </span>
                      <span
                        className={`font-medium ${organization?.properties?.notifications?.email ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}
                      >
                        {organization?.properties?.notifications?.email ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Bell className="h-4 w-4" /> Notificações Push
                      </span>
                      <span
                        className={`font-medium ${organization?.properties?.notifications?.push ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}
                      >
                        {organization?.properties?.notifications?.push ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Activity className="h-4 w-4" /> Resumo de Atividades
                      </span>
                      <span className="font-medium text-zinc-900 capitalize dark:text-zinc-100">
                        {organization?.properties?.notifications?.digest
                          ? organization.properties.notifications.digest === "daily"
                            ? "Diário"
                            : organization.properties.notifications.digest === "weekly"
                              ? "Semanal"
                              : "Mensal"
                          : "Não configurado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                {userIsOwner && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
                      <ShieldAlert className="h-4 w-4" /> Zona de Perigo
                    </h3>
                    <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/70">
                      Ações aqui não podem ser desfeitas. Tenha cuidado.
                    </p>
                    <button
                      onClick={handleDeleteOrganization}
                      className="mt-3 text-xs font-semibold text-red-600 underline hover:text-red-800"
                    >
                      Deletar Organização
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Owner Section */}
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-neutral-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
              <UserCog className="h-5 w-5 text-zinc-500" />
              Proprietário
            </h2>
          </div>
          <div className="p-6">
            {organization?.owner ? (
              <div className="flex items-center gap-4">
                {organization.owner.avatar_url ? (
                  <img
                    src={organization.owner.avatar_url}
                    alt={organization.owner.name}
                    className="h-16 w-16 rounded-full border-2 border-zinc-200 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                    <UserCog className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {organization.owner.name}
                    </span>
                    <Badge color="purple">Owner</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">@{organization.owner.username}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">
                Informações do proprietário não disponíveis
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modais flutuantes */}
      {isEditingInfo && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-md bg-neutral-50 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Editar Informações</h2>
            <div className="space-y-4">
              <input
                className="w-full rounded border border-zinc-200 p-2 text-sm"
                placeholder="Nome"
                value={formData.org_name}
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
              />
              <textarea
                className="w-full rounded border border-zinc-200 p-2 text-sm"
                rows={3}
                placeholder="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="px-3 py-2 text-sm text-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateInfo}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
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
