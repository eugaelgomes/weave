"use client";

import React from "react";
import { Building2, Trash2, RefreshCw, Plus, Activity } from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspacePageShell } from "@/app/(protected)/workspace/_components/workspace-page-shell";
import { WorkspaceImageEditModal } from "./_components/workspace-image-edit-modal";
import { SettingsForm } from "./_components/settings-form";
import { WorkspaceOverview } from "./_components/header";
import { useWorkspaceSettingsPage } from "./_hooks/use-workspace-settings-page";
import { AreasSection } from "./_components/areas-section";

const WorkspacePage = () => {
  const { t } = useLanguage();
  const {
    workspace,
    loading,
    hasWorkspace,
    stats,
    userIsOwner,
    isCreating,
    isEditingInfo,
    setIsEditingInfo,
    editingImage,
    setEditingImage,
    isDeleting,
    formData,
    setFormData,
    localProps,
    handleCreateWorkspace,
    handleUpdateInfo,
    handleUpdateImage,
    handleDirectPropertyChange,
    handleNestedPropertyChange,
    handleDeleteWorkspace,
    handleRestoreWorkspace,
  } = useWorkspaceSettingsPage();

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#workspace/image/logo") {
        setEditingImage("logo");
        setIsEditingInfo(false);
      } else if (hash === "#workspace/image/banner") {
        setEditingImage("banner");
        setIsEditingInfo(false);
      } else if (hash === "#workspace/info/edit") {
        setIsEditingInfo(true);
        setEditingImage(null);
      } else {
        setIsEditingInfo(false);
        setEditingImage(null);
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [setEditingImage, setIsEditingInfo]);

  if (!hasWorkspace && !workspace?.deleted) {
    return (
      <WorkspacePageShell description={t.workspaceGeneral.description}>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center py-4">
          <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:bg-[#1d1d1b]">
            <div className="dark:ring-surface-dark-border-strong mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-neutral-50 shadow-sm ring-1 ring-neutral-200 dark:bg-[#1d1d1b]">
              <Building2 className="h-10 w-10 text-neutral-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {t.workspaceGeneral.emptyTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-neutral-600 dark:text-neutral-400">
              {t.workspaceGeneral.emptyBody}
            </p>
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={isCreating}
              className="bg-brand-primary-500 mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-yellow-600 hover:shadow-lg disabled:opacity-70 dark:hover:bg-yellow-600"
            >
              {isCreating ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t.workspaceGeneral.createWorkspace}
            </button>
          </div>
        </div>
      </WorkspacePageShell>
    );
  }

  if (workspace?.deleted) {
    return (
      <WorkspacePageShell description={t.workspaceGeneral.description}>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center py-4">
          <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:bg-[#1d1d1b]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
              <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {t.workspaceGeneral.deletedTitle}
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              {t.workspaceGeneral.deletedBody}
            </p>
            <button
              type="button"
              onClick={handleRestoreWorkspace}
              className="bg-brand-primary-500 mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 dark:hover:bg-yellow-600"
            >
              <RefreshCw className="h-4 w-4" /> {t.workspaceGeneral.restoreWorkspace}
            </button>
          </div>
        </div>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell description={t.workspaceGeneral.description}>
      <div className="fade-in animate-in min-h-0 w-full min-w-0 flex-1 space-y-2 duration-500">
        <WorkspaceOverview
          workspace={workspace}
          userIsOwner={userIsOwner}
          setEditingImage={setEditingImage}
          setIsEditingInfo={setIsEditingInfo}
          isEditingInfo={isEditingInfo}
          handleUpdateInfo={handleUpdateInfo}
          formData={formData}
          setFormData={setFormData}
        />

        <div>
          <SettingsForm
            localProps={localProps}
            workspace={workspace}
            stats={stats}
            userIsOwner={userIsOwner}
            handleDirectPropertyChange={handleDirectPropertyChange}
            handleNestedPropertyChange={handleNestedPropertyChange}
            handleDeleteWorkspace={handleDeleteWorkspace}
            isDeleting={isDeleting}
          />
        </div>

        <AreasSection />

        <WorkspaceImageEditModal
          isOpen={!!editingImage}
          title={editingImage === "logo" ? "Editar Logo" : "Editar Banner"}
          currentUrl={
            editingImage === "logo"
              ? getStorageUrl(workspace?.logo_url || "")
              : getStorageUrl(workspace?.banner_url || "")
          }
          onClose={() => {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
            window.dispatchEvent(new HashChangeEvent("hashchange"));
            setEditingImage(null);
          }}
          onSave={handleUpdateImage}
          loading={loading}
        />
      </div>
    </WorkspacePageShell>
  );
};

export default WorkspacePage;
