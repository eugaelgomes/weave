"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, Building2, Lock, Zap, Settings, type LucideIcon } from "lucide-react";
import { SettingsHeader } from "../_components/ui/headers/settings-header";

type SettingsNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  matchPaths?: string[];
};

const SETTINGS_NAV: SettingsNavItem[] = [
  {
    icon: User,
    label: "Perfil",
    href: "/settings",
    matchPaths: ["/settings/user-data", "/settings/danger-zone"],
  },
  { icon: Building2, label: "Organização", href: "/settings/organization" },
  { icon: Lock, label: "Segurança", href: "/settings/security" },
  {
    icon: Zap,
    label: "Integrações",
    href: "/settings/integrations",
    matchPaths: ["/settings/client-tokens"],
  },
  { icon: Settings, label: "Preferências", href: "/settings/preferences" },
];

function resolveActiveSettingsHref(pathname: string): string | null {
  const matchers: { prefix: string; href: string }[] = [];
  for (const item of SETTINGS_NAV) {
    for (const prefix of [item.href, ...(item.matchPaths ?? [])]) {
      matchers.push({ prefix, href: item.href });
    }
  }
  matchers.sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, href } of matchers) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return href;
  }
  return null;
}

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeHref = useMemo(() => resolveActiveSettingsHref(pathname), [pathname]);

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <div className="p-2.5">
      <h2 className="mb-3 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Configurações
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
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`group relative flex w-full items-center justify-between rounded-md py-1.5 pr-2 pl-2 text-xs transition-all ${
                  isActive
                    ? "bg-amber-50 font-semibold text-neutral-900 shadow-sm ring-1 ring-amber-200/80 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-amber-900/40"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                }`}
              >
                {isActive ? (
                  <span
                    className="bg-brand-primary-500 absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                    aria-hidden
                  />
                ) : null}
                <div className="flex items-center gap-1.5 pl-0.5">
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
      <SettingsHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            aria-expanded={isMobileSidebarOpen}
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {isMobileSidebarOpen ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fechar menu
              </>
            ) : (
              <>
                <Menu className="h-3.5 w-3.5" />
                Abrir menu
              </>
            )}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL */}
          <div
            className="hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-md md:sticky md:block md:w-[180px] dark:border-neutral-800 dark:bg-neutral-900/50"
          >
            {sidebarContent}
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-neutral-950 md:dark:border-neutral-800">
            {children}
          </div>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            aria-label="Fechar menu de navegação"
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></button>

          <div className="ml-auto flex h-full w-[80%] max-w-xs flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
                Configurações
              </span>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900/40">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>;
}
