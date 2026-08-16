import React from "react";
import { Building2, Camera, Edit3, Clock, MapPin, X } from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { Input } from "@/app/(protected)/organization/general/_components/form-primitives";
import type { WorkspaceOverviewProps } from "@/app/(protected)/organization/general/_components/settings-types";

const textareaFocus =
  "w-full rounded-md text-[12px] font-medium transition-all outline-none py-1.5 border border-neutral-200 bg-white px-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-200";

const OrganizationHeroCard = ({
  workspace,
  userIsOwner,
  onEditLogo,
  onEditBanner,
  onOpenEditModal,
}: {
  workspace: WorkspaceOverviewProps["workspace"];
  userIsOwner: boolean;
  onEditLogo: () => void;
  onEditBanner: () => void;
  onOpenEditModal: () => void;
}) => (
  <div className="group dark:border-surface-dark-border-muted relative overflow-hidden rounded-md border border-neutral-100 bg-white dark:bg-[#1d1d1b]">
    <div className="relative h-48 w-full bg-neutral-100 dark:bg-[#1d1d1b]">
      {workspace?.banner_url ? (
        <img
          src={getStorageUrl(workspace.banner_url)}
          alt="Banner da organização"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-r from-neutral-200 to-neutral-100 opacity-60 dark:from-neutral-800 dark:to-[#1d1d1b]" />
      )}
      {userIsOwner && (
        <button
          type="button"
          onClick={onEditBanner}
          aria-label="Editar banner da organização"
          className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:bg-black/60"
        >
          <Camera className="h-4 w-4" />
        </button>
      )}
    </div>

    <div className="px-6 pb-6">
      <div className="relative -mt-12 mb-4 flex items-end justify-between">
        <div className="relative">
          <div className="dark:border-surface-dark-border-strong h-24 w-24 overflow-hidden rounded-md border-4 border-white bg-neutral-50 shadow-sm dark:bg-[#1d1d1b]">
            {workspace?.logo_url ? (
              <img
                src={getStorageUrl(workspace.logo_url)}
                alt="Logo da organização"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Building2 className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
              </div>
            )}
          </div>
          {userIsOwner && (
            <button
              type="button"
              onClick={onEditLogo}
              aria-label="Editar logo da organização"
              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100"
            >
              <Camera className="h-6 w-6" />
            </button>
          )}
        </div>

        {userIsOwner && (
          <button
            type="button"
            onClick={onOpenEditModal}
            aria-label="Editar informações da organização"
            title="Editar informações"
            className="dark:border-surface-dark-border mb-1 rounded-md border border-neutral-200 bg-white p-2 text-neutral-700 hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
            {workspace?.org_name}
            {workspace?.unique_name && (
              <span className="text-xs font-medium text-neutral-400">@{workspace.unique_name}</span>
            )}
          </h1>
          <p className="mt-1 max-w-2xl text-[11px] text-neutral-500 dark:text-neutral-400">
            {workspace?.description || "Sem slogan definido."}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Criado em{" "}
              {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : "-"}
            </div>

            {workspace?.address?.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {workspace.address.city}, {workspace.address.state}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EditOrganizationInfoModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: WorkspaceOverviewProps["handleUpdateInfo"];
  formData: WorkspaceOverviewProps["formData"];
  setFormData: WorkspaceOverviewProps["setFormData"];
}) => {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const sloganId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="dark:border-surface-dark-border-strong w-full max-w-md rounded-md border border-neutral-200 bg-white p-5 shadow-xl dark:bg-[#1d1d1b]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            Editar Informações
          </h2>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
              onClose();
            }}
            aria-label="Fechar modal de edição de organização"
            className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <p id={descriptionId} className="sr-only">
          Atualize nome, slug e slogan da organização.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Nome da Organização"
            value={formData.org_name}
            onChange={(value) => setFormData((current) => ({ ...current, org_name: value }))}
            placeholder="Ex: Acme Corp"
          />
          <Input
            label="Identificador Único (slug)"
            value={formData.unique_name}
            onChange={(value) => setFormData((current) => ({ ...current, unique_name: value }))}
            placeholder="Ex: acme-corp"
          />
          <div className="space-y-1">
            <label
              htmlFor={sloganId}
              className="mb-1 block text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase dark:text-neutral-500"
            >
              Slogan
            </label>
            <textarea
              id={sloganId}
              className={textareaFocus}
              rows={4}
              value={formData.slogan}
              onChange={(event) =>
                setFormData((current) => ({ ...current, slogan: event.target.value }))
              }
              placeholder="Uma frase curta que representa sua organização..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-1.5 text-[11px] font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-brand-primary-500 rounded-md px-4 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600 dark:hover:bg-amber-600"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function WorkspaceOverview({
  workspace,
  userIsOwner,
  setEditingImage,
  setIsEditingInfo,
  isEditingInfo,
  handleUpdateInfo,
  formData,
  setFormData,
}: WorkspaceOverviewProps) {
  return (
    <div className="space-y-6">
      <OrganizationHeroCard
        workspace={workspace}
        userIsOwner={userIsOwner}
        onEditLogo={() => { window.location.hash = "#organization/image/logo"; }}
        onEditBanner={() => { window.location.hash = "#organization/image/banner"; }}
        onOpenEditModal={() => { window.location.hash = "#organization/info/edit"; }}
      />

      <EditOrganizationInfoModal
        isOpen={isEditingInfo}
        onClose={() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          setIsEditingInfo(false);
        }}
        onSubmit={handleUpdateInfo}
        formData={formData}
        setFormData={setFormData}
      />
    </div>
  );
}
