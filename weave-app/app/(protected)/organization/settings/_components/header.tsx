import React from "react";
import {
  Building2,
  Camera,
  Edit3,
  Globe,
  Clock,
  Users,
  FolderOpen,
  Crown,
  ShieldCheck,
  CreditCard,
  MapPin,
} from "lucide-react";
import { Input } from "./ui-elements";
import { X } from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";

export function WorkspaceOverview({
  workspace,
  stats,
  userIsOwner,
  setEditingImage,
  setIsEditingInfo,
  isEditingInfo,
  handleUpdateInfo,
  formData,
  setFormData,
}: any) {
  return (
    <div className="space-y-6">
      {/* 1. Header & Identity */}
      <div className="group relative overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        {/* Banner */}
        <div className="relative h-48 w-full bg-zinc-100 dark:bg-[#1d1d1b]">
          {workspace?.banner_url ? (
            <img
              src={getStorageUrl(workspace.banner_url)}
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
              <div className="h-24 w-24 overflow-hidden rounded-md border-4 border-white bg-zinc-50 shadow-md dark:shadow-surface-dark-md dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]">
                {workspace?.logo_url ? (
                  <img
                    src={getStorageUrl(workspace.logo_url)}
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
                  className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100"
                >
                  <Camera className="h-6 w-6" />
                </button>
              )}
            </div>

            <div className="mb-1 flex gap-2">
              {userIsOwner && (
                <button
                  onClick={() => setIsEditingInfo(true)}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Detalhes
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
                {workspace?.org_name}
                {workspace?.unique_name && (
                  <span className="text-sm font-normal text-zinc-400">
                    @{workspace.unique_name}
                  </span>
                )}
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-zinc-500 dark:text-zinc-400">
                {workspace?.description || "Sem descrição definida."}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Criado em{" "}
                  {workspace?.created_at
                    ? new Date(workspace.created_at).toLocaleDateString()
                    : "-"}
                </div>

                {workspace?.address?.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {workspace.address.city}, {workspace.address.state}
                  </div>
                )}
              </div>
            </div>

            {/* Owner Mini-Card */}
            {workspace?.owner && (
              <div className="flex items-center gap-3 rounded-md border border-zinc-100 bg-zinc-50/50 px-4 py-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]/50">
                <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-200">
                  {workspace.owner.avatar_url ? (
                    <img
                      src={getStorageUrl(workspace.owner.avatar_url)}
                      alt={workspace.owner.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <Crown className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                    Proprietário
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {workspace.owner.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col rounded-md border border-zinc-200 bg-white p-4 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
            <Users className="h-3.5 w-3.5" /> Membros
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalMembers}
          </span>
        </div>

        <div className="flex flex-col rounded-md border border-zinc-200 bg-white p-4 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
            <FolderOpen className="h-3.5 w-3.5" /> Projetos
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalProjects}
          </span>
        </div>

        <div className="flex flex-col rounded-md border border-zinc-200 bg-white p-4 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
            <ShieldCheck className="h-3.5 w-3.5" /> Admins
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalAdmins}
          </span>
        </div>

        <div className="flex flex-col rounded-md border border-zinc-200 bg-white p-4 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
            <CreditCard className="h-3.5 w-3.5" /> Plano
          </div>
          <span className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {workspace.plan_name || "Free"}
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditingInfo && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 shadow-2xl dark:shadow-surface-dark-xl dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Editar Informações</h2>
              <button
                onClick={() => setIsEditingInfo(false)}
                className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <Input
                label="Nome do Workspace"
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
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-zinc-100 dark:focus:border-zinc-700 focus:dark:ring-zinc-800"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Uma breve descrição sobre o workspace..."
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
    </div>
  );
}
