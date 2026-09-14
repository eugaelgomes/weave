import React from "react";
import Link from "next/link";
import { type Workspace, type WorkspaceProperties } from "@/app/_services/workspace";
import { type WorkspaceStats } from "@/app/_contexts/workspace-context";
import { Settings, Bell, Layers, ShieldAlert, MapPin, Network } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { Toggle, Select } from "./form-primitives";
import {
  type OnDirectPropertyChange,
  type OnNestedPropertyChange,
} from "./settings-types";

interface SettingsFormProps {
  localProps: WorkspaceProperties;
  userIsOwner: boolean;
  handleDirectPropertyChange: OnDirectPropertyChange;
  handleNestedPropertyChange: OnNestedPropertyChange;
  handleDeleteWorkspace: () => void;
  isDeleting: boolean;
  workspace: Workspace | null;
  stats: WorkspaceStats;
}

export function SettingsForm({
  localProps,
  userIsOwner,
  handleDirectPropertyChange,
  handleNestedPropertyChange,
  handleDeleteWorkspace,
  isDeleting,
  workspace,
}: SettingsFormProps) {
  const { t } = useLanguage();
  const address = workspace?.address as
    | {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
      }
    | undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="dark:border-surface-dark-border-muted space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:bg-[#1d1d1b]/20">
          <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            <Settings size={12} className="text-amber-500" />
            {t.workspaceGeneral.settingsSectionTitle}
          </h2>

          <div className="space-y-4">
            <Select
              label={t.workspaceGeneral.defaultLanguage}
              value={localProps.language || "pt-BR"}
              onChange={(value) => handleDirectPropertyChange("language", value)}
              options={[
                { label: "Português (Brasil)", value: "pt-BR" },
                { label: "Inglês (US)", value: "en-US" },
                { label: "Español", value: "es" },
              ]}
              disabled={!userIsOwner}
            />
            <Select
              label={t.workspaceGeneral.timezone}
              value={localProps.timezone || "America/Sao_Paulo"}
              onChange={(value) => handleDirectPropertyChange("timezone", value)}
              options={[
                { label: "Brasília (GMT-3)", value: "America/Sao_Paulo" },
                { label: "UTC", value: "UTC" },
                { label: "New York (EST)", value: "America/New_York" },
              ]}
              disabled={!userIsOwner}
            />
            <div className="pt-2">
              <Toggle
                label={t.workspaceGeneral.allowPublicNotes}
                description={t.workspaceGeneral.allowPublicNotesHint}
                checked={localProps?.allowPublicNotes || false}
                onChange={(checked) => handleDirectPropertyChange("allowPublicNotes", checked)}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>

        <section className="dark:border-surface-dark-border-muted space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:bg-[#1d1d1b]/20">
          <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            <MapPin size={12} className="text-amber-500" />
            {t.workspaceGeneral.locationSectionTitle}
          </h2>
          <div className="space-y-3 text-[11px] text-neutral-500">
            {address ? (
              <>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.workspaceGeneral.addressLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.street || "-"}
                  </span>
                </div>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.workspaceGeneral.cityStateLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.city ? `${address.city}, ${address.state}` : "-"}
                  </span>
                </div>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.workspaceGeneral.countryLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.country || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className="italic">{t.workspaceGeneral.noAddress}</p>
            )}
            <div className="mt-3 rounded-md bg-neutral-100/50 p-2.5 text-[10px] dark:bg-[#1d1d1b]/50">
              {t.workspaceGeneral.addressBillingHint}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="dark:border-surface-dark-border-muted space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:bg-[#1d1d1b]/20">
          <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            <Layers size={12} className="text-amber-500" />
            {t.workspaceGeneral.featuresSectionTitle}
          </h2>
          <div className="space-y-1 divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
            <Toggle
              label={t.workspaceGeneral.featureAiAgent}
              description={t.workspaceGeneral.featureAiAgentHint}
              checked={localProps?.features?.aiAgent || false}
              onChange={(checked) => handleNestedPropertyChange("features", "aiAgent", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label={t.workspaceGeneral.featureBackup}
              description={t.workspaceGeneral.featureBackupHint}
              checked={localProps?.features?.backup || false}
              onChange={(checked) => handleNestedPropertyChange("features", "backup", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label={t.workspaceGeneral.featureCollaboration}
              description={t.workspaceGeneral.featureCollaborationHint}
              checked={localProps?.features?.collaboration || false}
              onChange={(checked) =>
                handleNestedPropertyChange("features", "collaboration", checked)
              }
              disabled={!userIsOwner}
            />
          </div>
        </section>

        <section className="dark:border-surface-dark-border-muted space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:bg-[#1d1d1b]/20">
          <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            <Bell size={12} className="text-amber-500" />
            {t.workspaceGeneral.notificationsSectionTitle}
          </h2>
          <div className="space-y-3">
            <div className="space-y-1 divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
              <Toggle
                label={t.workspaceGeneral.notificationEmail}
                checked={localProps?.notifications?.email || false}
                onChange={(checked) =>
                  handleNestedPropertyChange("notifications", "email", checked)
                }
                disabled={!userIsOwner}
              />
              <Toggle
                label={t.workspaceGeneral.notificationPush}
                checked={localProps?.notifications?.push || false}
                onChange={(checked) => handleNestedPropertyChange("notifications", "push", checked)}
                disabled={!userIsOwner}
              />
            </div>
            <div className="pt-2">
              <Select
                label={t.workspaceGeneral.digestFrequency}
                value={localProps?.notifications?.digest || "weekly"}
                onChange={(value) => handleNestedPropertyChange("notifications", "digest", value)}
                options={[
                  { label: t.workspaceGeneral.digestDaily, value: "daily" },
                  { label: t.workspaceGeneral.digestWeekly, value: "weekly" },
                  { label: t.workspaceGeneral.digestMonthly, value: "monthly" },
                ]}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>
      </div>

      {userIsOwner ? (
        <section className="space-y-3 rounded-md border border-red-100 bg-red-50/20 p-4 dark:border-red-900/20 dark:bg-red-950/10">
          <div className="mb-2">
            <h2 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-red-600 dark:text-red-400">
              <ShieldAlert size={12} />
              {t.workspaceGeneral.dangerZoneTitle}
            </h2>
            <p className="text-[11px] text-red-500/80 dark:text-red-400/80">
              {t.workspaceGeneral.dangerZoneHint}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-red-200/50 bg-white/50 p-3 dark:border-red-900/30 dark:bg-[#1d1d1b]/50">
            <div>
              <h4 className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                {t.workspaceGeneral.deleteWorkspaceTitle}
              </h4>
              <p className="text-[10px] text-neutral-500">{t.workspaceGeneral.deleteWorkspaceHint}</p>
            </div>
            <button
              type="button"
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? t.workspaceGeneral.deleting : t.workspaceGeneral.deleteWorkspaceButton}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
