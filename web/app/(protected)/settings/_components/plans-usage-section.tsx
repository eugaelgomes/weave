"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { type Workspace, type WorkspaceProperties } from "@/app/_services/workspace";
import { type WorkspaceStats } from "@/app/_contexts/workspace-context";

type PlansUsageSectionProps = {
  workspace: Workspace | null;
  stats: WorkspaceStats;
  localProps: WorkspaceProperties;
  userIsOwner: boolean;
};

export function PlansUsageSection({
  workspace,
  stats,
  localProps,
  userIsOwner,
}: PlansUsageSectionProps) {
  const { t } = useLanguage();
  const params = useParams();

  const currentPlan = workspace?.plan_name || "Free";
  const planValue = workspace?.plan_value || 0;
  const currency = workspace?.currency || "BRL";

  const memberLimit =
    localProps.maxMembers && localProps.maxMembers > 0 ? localProps.maxMembers : 50;
  const projectLimit =
    localProps.maxProjects && localProps.maxProjects > 0 ? localProps.maxProjects : 100;
  const memberPercent = Math.min((stats.totalMembers / memberLimit) * 100, 100);
  const projectPercent = Math.min((stats.totalProjects / projectLimit) * 100, 100);

  const billingPeriod =
    workspace?.billing_cycle === "monthly"
      ? t.workspacePlans.billingMonthly
      : t.workspacePlans.billingYearly;

  return (
    <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
      <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
        <CreditCard className="h-5 w-5 text-neutral-500" />
        {t.workspacePlans.sectionTitle}
      </h2>

      <div className="dark:border-surface-dark-border-strong mb-6 rounded-md border border-neutral-100 bg-neutral-50 p-4 dark:bg-[#1d1d1b]/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {t.workspacePlans.currentPlan.replace("{plan}", currentPlan)}
            </p>
            <p className="text-xs text-neutral-500">
              {planValue > 0
                ? t.workspacePlans.paidPlan
                    .replace("{currency}", currency)
                    .replace("{value}", planValue.toFixed(2))
                    .replace("{period}", billingPeriod)
                : t.workspacePlans.freePlan}
            </p>
          </div>
          {userIsOwner ? (
            <Link
              href={`/settings/plans`}
              className="bg-brand-yellow text-brand-navy hover:bg-brand-orange rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {t.workspacePlans.manageSubscription}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">
              {t.workspacePlans.membersUsage}
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {stats.totalMembers} / {memberLimit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="bg-brand-primary-500 h-full rounded-full transition-all"
              style={{ width: `${memberPercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">
              {t.workspacePlans.projectsUsage}
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {stats.totalProjects} / {projectLimit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="bg-brand-primary-500 h-full rounded-full transition-all"
              style={{ width: `${projectPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
