"use client";

import React from "react";
import { Puzzle, Zap } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { type Organization } from "@/app/_services/organization";

type IntegrationsSectionProps = {
  organization: Organization | null;
};

export function IntegrationsSection({ organization }: IntegrationsSectionProps) {
  const { t } = useLanguage();
  const integrations =
    organization?.integrations && typeof organization.integrations === "object"
      ? (organization.integrations as Record<string, unknown>)
      : {};
  const integrationEntries = Object.entries(integrations);

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-100 bg-neutral-50/30 p-5 dark:bg-[#1d1d1b]/20">
      <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-wider text-neutral-900 uppercase dark:text-neutral-100">
        <Puzzle className="h-4 w-4 text-amber-500" />
        {t.organizationIntegrations.sectionTitle}
      </h2>

      {integrationEntries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrationEntries.map(([key]) => (
            <div
              key={key}
              className="dark:border-surface-dark-border flex items-center justify-between rounded-md border border-neutral-200 bg-white p-3 dark:bg-[#1d1d1b]"
            >
              <div className="font-medium capitalize">{key}</div>
              <div className="flex items-center gap-2">
                <span className="sr-only">{t.organizationIntegrations.activeIntegration}</span>
                <div className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dark:border-surface-dark-border flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center dark:bg-[#1d1d1b]/50">
          <Zap className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-600" />
          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {t.organizationIntegrations.emptyTitle}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {t.organizationIntegrations.emptyBody}
          </p>
        </div>
      )}
    </section>
  );
}
