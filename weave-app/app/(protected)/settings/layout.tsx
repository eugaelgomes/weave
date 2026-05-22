"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Lock, Zap, CreditCard, type LucideIcon } from "lucide-react";
import { SettingsHeader } from "../_components/ui/headers/settings-header";
import { useLanguage } from "@/app/_contexts/language-context";

type SettingsNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  matchPaths?: string[];
  type: "settings" | "workspace" | "plans" | "security" | "integrations" | "preferences";
};

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const SETTINGS_NAV: SettingsNavItem[] = useMemo(
    () => [
      {
        icon: User,
        label: t.nav.settings,
        href: "/settings",
        matchPaths: ["/settings/user-data", "/settings/danger-zone", "/settings/preferences"],
        type: "settings" as const,
      },
      {
        icon: CreditCard,
        label: t.nav.plans,
        href: "/settings/plans",
        type: "plans" as const,
      },
      {
        icon: Lock,
        label: t.nav.security,
        href: "/settings/security",
        matchPaths: ["/settings/client-tokens"],
        type: "security" as const,
      },
      {
        icon: Building2,
        label: t.nav.workspace,
        href: "/settings/workspace",
        type: "workspace" as const,
      },
      {
        icon: Zap,
        label: t.nav.integrations,
        href: "/settings/integrations",
        type: "integrations" as const,
      },
    ],
    [t]
  );

  const activeItem = useMemo(() => {
    const matchers: { prefix: string; item: SettingsNavItem }[] = [];
    for (const item of SETTINGS_NAV) {
      for (const prefix of [item.href, ...(item.matchPaths ?? [])]) {
        matchers.push({ prefix, item });
      }
    }
    matchers.sort((a, b) => b.prefix.length - a.prefix.length);
    for (const { prefix, item } of matchers) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return item;
    }
    return SETTINGS_NAV[0];
  }, [pathname]);

  const activeHref = activeItem.href;

  const sidebarContent = (
    <div className="p-2">
      <h2 className="mb-3 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        {t.nav.settingsLabel}
      </h2>

      <ul className="space-y-0.5">
        {SETTINGS_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex w-full items-center rounded-md px-2 py-1.5 text-xs transition-all ${
                  isActive
                    ? "bg-amber-100/70 font-medium text-neutral-900 dark:bg-amber-500/10 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      isActive
                        ? "text-brand-primary-500"
                        : "text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      <SettingsHeader type={activeItem.type} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* Same shell as /notes: sticky sidebar + scrollable main */}
          <div className="dark:border-surface-dark-border hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-md md:sticky md:block md:h-[calc(100vh-auto)] md:w-[180px] dark:bg-[#1d1d1b]/50">
            {sidebarContent}
          </div>

          <div className="dark:shadow-surface-dark-sm md:dark:border-surface-dark-border flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-[#1d1d1b]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>;
}
