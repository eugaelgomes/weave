"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, Zap, CreditCard, type LucideIcon } from "lucide-react";
import { SettingsHeader } from "../_components/ui/headers/settings-header";
import { useLanguage } from "@/app/_contexts/language-context";
import { ModuleLayout } from "../_components/layout/module-layout";

type SettingsNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  matchPaths?: string[];
  type: "settings" | "plans" | "security" | "integrations" | "preferences";
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
    <ModuleLayout header={<SettingsHeader type={activeItem.type} />} sidebarContent={sidebarContent}>
      {children}
    </ModuleLayout>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>;
}
