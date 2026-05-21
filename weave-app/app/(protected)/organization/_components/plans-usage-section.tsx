"use client";

import React from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import {
  type Organization,
  type OrganizationProperties,
} from "@/app/_services/organization";
import { type OrganizationStats } from "@/app/_contexts/organization-context";

type PlansUsageSectionProps = {
  organization: Organization | null;
  stats: OrganizationStats;
  localProps: OrganizationProperties;
  userIsOwner: boolean;
};

export function PlansUsageSection({
  organization,
  stats,
  localProps,
  userIsOwner,
}: PlansUsageSectionProps) {
  const { t } = useLanguage();
  const currentPlan = organization?.plan_name || "Free";
  const planValue = organization?.plan_value || 0;
  const currency = organization?.currency || "BRL";

  const memberLimit = localProps.maxMembers && localProps.maxMembers > 0 ? localProps.maxMembers : 50;
  const projectLimit =
    localProps.maxProjects && localProps.maxProjects > 0 ? localProps.maxProjects : 100;
  const memberPercent = Math.min((stats.totalMembers / memberLimit) * 100, 100);
  const projectPercent = Math.min((stats.totalProjects / projectLimit) * 100, 100);

  const billingPeriod =
    organization?.billing_cycle === "monthly"
      ? t.organizationPlans.billingMonthly
      : t.organizationPlans.billingYearly;

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
      <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
        <CreditCard className="h-5 w-5 text-neutral-500" />
        {t.organizationPlans.sectionTitle}
      </h2>

      <div className="mb-6 rounded-md border border-neutral-100 bg-neutral-50 p-4 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {t.organizationPlans.currentPlan.replace("{plan}", currentPlan)}
            </p>
            <p className="text-xs text-neutral-500">
              {planValue > 0
                ? t.organizationPlans.paidPlan
                    .replace("{currency}", currency)
                    .replace("{value}", planValue.toFixed(2))
                    .replace("{period}", billingPeriod)
                : t.organizationPlans.freePlan}
            </p>
          </div>
          {userIsOwner ? (
            <Link
              href="/settings/plans"
              className="rounded-md bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-navy transition-colors hover:bg-brand-orange"
            >
              {t.organizationPlans.manageSubscription}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">
              {t.organizationPlans.membersUsage}
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
              {t.organizationPlans.projectsUsage}
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
