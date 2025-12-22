"use client";

import React, { useState } from "react";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  Building2,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Shield,
  ShieldAlert,
  Activity,
  Layers,
  Camera,
  Check,
  AlertTriangle,
  UploadCloud,
} from "lucide-react";

// Componente auxiliar para Modal de Edição de Imagem
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed border-neutral-200 bg-neutral-50 py-8 dark:border-neutral-800 dark:bg-neutral-950">
          {url ? (
            <img src={url} alt="Preview" className="h-32 w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center text-neutral-400">
              <UploadCloud className="mb-2 h-10 w-10" />
              <span className="text-sm">Preview da Imagem</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">
              URL da Imagem
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.png"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(url)}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-yellow-500 px-6 py-2 text-sm font-semibold text-neutral-950 hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
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
    error,
    hasOrganization,
    createOrganization,
    updateOrganization,
    updateProperties,
    deleteOrganization,
    addMember,
    removeMember,
    getStats,
    isOwner,
    canManageMembers,
  } = useOrganization();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Estados para modais de imagem
  const [editingImage, setEditingImage] = useState<"logo" | "banner" | null>(null);

  const [showAddMember, setShowAddMember] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    org_name: "",
    description: "",
    logo_url: "",
    banner_url: "",
  });

  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member">("member");

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;
  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  // Handlers
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createOrganization(formData);
    if (result) {
      setIsCreating(false);
      setFormData({ org_name: "", description: "", logo_url: "", banner_url: "" });
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mantém as URLs atuais, atualiza apenas textos
    const updatedData = {
      ...formData,
      logo_url: organization?.logo_url || "",
      banner_url: organization?.banner_url || "",
    };
    const result = await updateOrganization(updatedData);
    if (result) {
      setIsEditingInfo(false);
    }
  };

  // Handler específico para atualização rápida de imagens
  const handleUpdateImage = async (url: string) => {
    if (!editingImage) return;

    const updatedData = {
      org_name: organization?.org_name || "",
      description: organization?.description || "",
      logo_url: editingImage === "logo" ? url : organization?.logo_url || "",
      banner_url: editingImage === "banner" ? url : organization?.banner_url || "",
    };

    const result = await updateOrganization(updatedData);
    if (result) {
      setEditingImage(null);
    }
  };

  const handleDeleteOrganization = async () => {
    if (confirm("Tem certeza que deseja deletar a organização?")) {
      await deleteOrganization();
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addMember(newMemberId, newMemberRole);
    if (success) {
      setShowAddMember(false);
      setNewMemberId("");
      setNewMemberRole("member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("Tem certeza que deseja remover este membro?")) {
      await removeMember(memberId);
    }
  };

  const handleToggleFeature = async (featureName: string) => {
    if (!organization?.properties?.features) return;

    const updatedFeatures = {
      ...organization.properties.features,
      [featureName]:
        !organization.properties.features[
          featureName as keyof typeof organization.properties.features
        ],
    };

    await updateProperties({
      ...organization.properties,
      features: updatedFeatures,
    });
  };

  // No Organization - Create Form
  if (!hasOrganization && !isCreating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
        <div className="flex w-full max-w-lg flex-col items-center rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
            <Building2 className="h-8 w-8 text-neutral-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Sua Organização
          </h1>
          <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400">
            Crie uma organização para centralizar seus projetos e equipe.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-md bg-yellow-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-yellow-600"
          >
            <Plus className="h-4 w-4" /> Criar Organização
          </button>
        </div>
      </div>
    );
  }

  // Create Organization Form (Mantido igual, focando na dashboard abaixo)
  if (isCreating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
        <div className="w-full max-w-xl rounded-md border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Nova Organização
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateOrganization} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">
                Nome *
              </label>
              <input
                type="text"
                value={formData.org_name}
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                rows={3}
              />
            </div>
            {/* Inputs de URL simplificados para criação inicial */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="url"
                placeholder="URL do Logo"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              />
              <input
                type="url"
                placeholder="URL do Banner"
                value={formData.banner_url}
                onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500 px-6 py-2 text-sm font-semibold text-neutral-950 hover:bg-yellow-600 disabled:opacity-50"
              >
                {loading ? "Criando..." : "Criar Organização"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ===================== DASHBOARD PRINCIPAL =====================
  return (
    <div className="min-h-screen rounded-md border border-neutral-200 bg-neutral-50 pb-12 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
      {/* 1. BANNER (Click-to-Edit) */}
      <div
        className={`group relative h-48 w-full bg-neutral-200 dark:bg-neutral-900 ${userIsOwner ? "cursor-pointer" : ""}`}
        onClick={() => userIsOwner && setEditingImage("banner")}
        title={userIsOwner ? "Clique para alterar o banner" : ""}
      >
        {loading && !organization ? (
          <div className="h-full w-full animate-pulse rounded-md bg-neutral-300 dark:bg-neutral-800"></div>
        ) : organization?.banner_url ? (
          <img
            src={organization.banner_url}
            alt="Banner"
            className="h-full w-full object-cover rounded-md opacity-90 transition-opacity group-hover:opacity-75"
          />
        ) : (
          <div className="pattern-grid-lg h-full w-full rounded-md bg-gradient-to-r from-neutral-800 to-neutral-900"></div>
        )}

        {/* Overlay de Edição do Banner */}
        {userIsOwner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex items-center gap-2 rounded-md bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
              <Camera className="h-4 w-4" /> Alterar Capa
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent"></div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header Profile */}
        <div className="relative -mt-16 mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          {/* 2. LOGO (Click-to-Edit) */}
          <div
            className={`group relative ${userIsOwner ? "cursor-pointer" : ""}`}
            onClick={() => userIsOwner && setEditingImage("logo")}
            title={userIsOwner ? "Clique para alterar o logo" : ""}
          >
            {loading && !organization ? (
              <div className="h-32 w-32 animate-pulse rounded-md bg-neutral-300 ring-4 ring-neutral-50 dark:bg-neutral-800 dark:ring-neutral-950"></div>
            ) : (
              <div className="relative h-32 w-32 overflow-hidden rounded-md border border-neutral-200 bg-white p-1 shadow-sm ring-4 ring-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-neutral-950">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt="Logo"
                    className="h-full w-full rounded-md object-cover transition-all group-hover:scale-105 group-hover:brightness-75"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 dark:bg-neutral-800">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}

                {/* Overlay de Edição do Logo */}
                {userIsOwner && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Camera className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info & Actions */}
          <div className="flex-1 pb-2">
            {loading && !organization ? (
              <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded bg-neutral-300 dark:bg-neutral-800"></div>
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-300 dark:bg-neutral-800"></div>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {organization?.org_name}
                  </h1>
                  <p className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
                    @{organization?.unique_name}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {organization?.description || "Sem descrição definida."}
                  </p>
                </div>
                {userIsOwner && !loading && (
                  <button
                    onClick={() => {
                      setFormData({
                        org_name: organization?.org_name || "",
                        description: organization?.description || "",
                        logo_url: "", // Não editamos URL aqui
                        banner_url: "", // Não editamos URL aqui
                      });
                      setIsEditingInfo(true);
                    }}
                    className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Editar Informações
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Membros", value: stats.totalMembers, icon: Users },
            { label: "Projetos", value: stats.totalProjects, icon: Layers },
            { label: "Admins", value: stats.totalAdmins, icon: Shield },
            { label: "Recursos Ativos", value: stats.featuresEnabled, icon: Activity },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-500">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {loading ? "-" : item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content Column (2/3) */}
          <div className="space-y-8 lg:col-span-2">
            {/* Members Section */}
            <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5 text-neutral-400" /> Membros
                </h2>
                {userCanManage && !loading && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                )}
              </div>

              {showAddMember && (
                <div className="border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <form onSubmit={handleAddMember} className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      placeholder="ID do Usuário"
                      value={newMemberId}
                      onChange={(e) => setNewMemberId(e.target.value)}
                      className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                      required
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as "admin" | "member")}
                      className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <option value="member">Membro</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-yellow-600"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddMember(false)}
                        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {/* Lista de Membros (Simplificada para brevidade, mantém a lógica original) */}
                {loading && !organization ? (
                  <div className="p-6 text-center text-sm text-neutral-500">
                    Carregando membros...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {organization?.members?.owner}
                          </p>
                          <p className="text-xs text-neutral-500">Proprietário</p>
                        </div>
                      </div>
                    </div>
                    {organization?.members?.members?.map((memberId) => (
                      <div
                        key={memberId}
                        className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {memberId}
                            </p>
                            <p className="text-xs text-neutral-500">Membro</p>
                          </div>
                        </div>
                        {userCanManage && (
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column (1/3) */}
          <div className="space-y-8">
            {/* Features & Settings (Mesmo layout, omitido para focar na mudança principal) */}
            <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Activity className="h-5 w-5 text-neutral-400" /> Funcionalidades
                </h2>
              </div>
              <div className="space-y-2 p-4">
                {Object.entries(organization?.properties?.features || {}).map(
                  ([feature, enabled]) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50"
                    >
                      <span className="text-sm font-medium text-neutral-700 capitalize dark:text-neutral-300">
                        {feature}
                      </span>
                      {userIsOwner ? (
                        <button
                          onClick={() => handleToggleFeature(feature)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-md transition-colors ${enabled ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-md bg-white transition-transform ${enabled ? "translate-x-4.5" : "translate-x-1"}`}
                          />
                        </button>
                      ) : (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${enabled ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-500"}`}
                        >
                          {enabled ? "Ativo" : "Inativo"}
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Danger Zone */}
            {userIsOwner && (
              <div className="overflow-hidden rounded-md border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/10">
                <div className="px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-500">
                    <ShieldAlert className="h-5 w-5" /> Zona de Perigo
                  </h2>
                  <button
                    onClick={handleDeleteOrganization}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" /> Deletar Organização
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais de Edição */}

      {/* 1. Editar Infos Básicas (Sem URL de Imagem) */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-md border border-neutral-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-6 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Editar Informações
            </h2>
            <form onSubmit={handleUpdateInfo} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">
                  Nome da Organização
                </label>
                <input
                  type="text"
                  value={formData.org_name}
                  onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-yellow-500 px-6 py-2 text-sm font-semibold text-neutral-950 hover:bg-yellow-600 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modais de Imagem (Banner e Logo) */}
      <ImageEditModal
        isOpen={editingImage === "logo"}
        title="Alterar Logo"
        currentUrl={organization?.logo_url || ""}
        onClose={() => setEditingImage(null)}
        onSave={handleUpdateImage}
        loading={loading}
      />
      <ImageEditModal
        isOpen={editingImage === "banner"}
        title="Alterar Capa (Banner)"
        currentUrl={organization?.banner_url || ""}
        onClose={() => setEditingImage(null)}
        onSave={handleUpdateImage}
        loading={loading}
      />
    </div>
  );
};

export default OrganizationPage;
