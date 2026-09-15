"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { User, Lock, Zap, CreditCard, X, LogOut, Search, Building2, Sun, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { useTheme } from "@/app/_contexts/theme-context";
import { ApiTokensProvider } from "@/app/_contexts/api-tokens-context";
import { BackupProvider } from "@/app/_contexts/backup-context";
import { SlackProvider } from "@/app/_contexts/slack-context";
import { WorkspaceProvider } from "@/app/_contexts/workspace-context";
import { useAuth } from "@/app/_contexts/auth-context";

// Tabs imports
import AccountSettingsTab from "./account-tab";
import PlansSettingsTab from "./plans-tab";
import SecuritySettingsTab from "./security-tab";
import IntegrationsSettingsTab from "./integrations-tab";
import WorkspaceGeneralPage from "@/app/(protected)/settings/[publicId]/settings/general/page";
import WorkspacePlansPage from "@/app/(protected)/settings/[publicId]/settings/plans/page";
import WorkspaceIntegrationsPage from "@/app/(protected)/settings/[publicId]/settings/integrations/page";

export type SettingsTab =
  | "account"
  | "plans"
  | "security"
  | "integrations"
  | "workspace-general"
  | "workspace-plans"
  | "workspace-integrations";

type SettingsNavItem = {
  id: SettingsTab;
  icon: LucideIcon;
  label: string;
  section: "account" | "workspace";
};

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

const SettingsModalContent: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "account",
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { logout, user, updateUser } = useAuth();

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (user) {
      updateUser({ theme_mode: nextTheme }).catch((err) =>
        console.error("Failed to persist theme sync:", err)
      );
    }
  };

  const settingsHash = (tab: SettingsTab) => {
    const userPublicId = user?.public_id;
    if (!userPublicId) return "#settings";

    const pathByTab: Record<SettingsTab, string> = {
      account: "account",
      plans: "plans",
      security: "security",
      integrations: "integrations",
      "workspace-general": "workspace/general",
      "workspace-plans": "workspace/plans",
      "workspace-integrations": "workspace/integrations",
    };

    return `#settings/${encodeURIComponent(userPublicId)}/${pathByTab[tab]}`;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#settings/")) {
        const [, userId, scope, nestedScope] = hash.split("/");
        if (!userId || !scope) return;

        if (scope === "workspace") {
          const workspaceTab = `workspace-${nestedScope}` as SettingsTab;
          if (
            ["workspace-general", "workspace-plans", "workspace-integrations"].includes(
              workspaceTab
            )
          ) {
            setActiveTab(workspaceTab);
          }
          return;
        }

        if (scope === "me") setActiveTab("account");
        else if (scope === "plan") setActiveTab("plans");
        else if (["account", "plans", "security", "integrations"].includes(scope)) {
          setActiveTab(scope as SettingsTab);
        }
      } else if (initialTab && hash === "#settings") {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${settingsHash(initialTab)}`
        );
        setActiveTab(initialTab);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isOpen, initialTab, user?.public_id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const SETTINGS_NAV: SettingsNavItem[] = useMemo(
    () => [
      {
        id: "account",
        icon: User,
        label: t.nav.settingsLabel || t.nav.settings || "Conta",
        section: "account",
      },
      {
        id: "plans",
        icon: CreditCard,
        label: t.nav.plans || "Planos",
        section: "account",
      },
      {
        id: "security",
        icon: Lock,
        label: t.nav.security || "Segurança",
        section: "account",
      },
      {
        id: "integrations",
        icon: Zap,
        label: t.nav.integrations || "Integrações",
        section: "account",
      },
      {
        id: "workspace-general",
        icon: Building2,
        label: t.nav.general || "Geral",
        section: "workspace",
      },
      {
        id: "workspace-plans",
        icon: CreditCard,
        label: t.nav.plans || "Planos",
        section: "workspace",
      },
      {
        id: "workspace-integrations",
        icon: Zap,
        label: t.nav.integrations || "Integrações",
        section: "workspace",
      },
    ],
    [t]
  );
  const filteredNavigation = SETTINGS_NAV.filter((item) =>
    item.label.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())
  );
  const accountNavigation = filteredNavigation.filter((item) => item.section === "account");
  const workspaceNavigation = filteredNavigation.filter((item) => item.section === "workspace");

  if (!mounted || !isOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettingsTab />;
      case "plans":
        return <PlansSettingsTab />;
      case "security":
        return <SecuritySettingsTab />;
      case "integrations":
        return <IntegrationsSettingsTab />;
      case "workspace-general":
        return <WorkspaceGeneralPage />;
      case "workspace-plans":
        return <WorkspacePlansPage />;
      case "workspace-integrations":
        return <WorkspaceIntegrationsPage />;
      default:
        return <AccountSettingsTab />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/40 p-3 backdrop-blur-sm sm:p-6 dark:bg-black/60">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-2xl shadow-neutral-900/10 transition-all sm:h-[620px] sm:flex-row dark:border-white/10 dark:bg-[#1d1d1b] dark:shadow-black/60 ring-1 ring-black/5 dark:ring-white/5">
        {/* Mobile Header (visible only on small screens) */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 bg-white p-3.5 sm:hidden dark:border-white/10 dark:bg-[#181817]">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t.nav.settingsLabel || "Configurações"}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleTheme}
              title={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
              aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar configurações"
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col border-b border-neutral-200/80 bg-neutral-50/70 sm:w-56 sm:border-r sm:border-b-0 dark:border-white/10 dark:bg-[#181817]">
          <div className="hidden border-b border-neutral-200/80 p-2.5 sm:block dark:border-white/10">
            <label className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-2.5 text-neutral-400 transition-colors focus-within:border-brand-primary-500/60 focus-within:ring-1 focus-within:ring-brand-primary-500/20 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-400">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Procurar"
                className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {(["account", "workspace"] as const).map((section) => {
              const items = section === "account" ? accountNavigation : workspaceNavigation;
              if (!items.length) return null;

              return (
                <div key={section} className={section === "workspace" ? "mt-3.5" : ""}>
                  <p className="mb-1 px-2 text-[10px] font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                    {section === "account" ? "Sua conta" : "Workspace atual"}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <li key={item.id} className="flex-shrink-0 sm:w-full">
                          <button
                            onClick={() => {
                              window.location.hash = settingsHash(item.id);
                            }}
                            className={`group flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                              isActive
                                ? "bg-neutral-200/70 font-semibold text-neutral-900 dark:bg-white/10 dark:text-white"
                                : "text-neutral-600 hover:bg-neutral-200/40 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                                  isActive
                                    ? "text-brand-primary-500 dark:text-brand-primary-400"
                                    : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            <div className="mt-auto hidden border-t border-neutral-200/80 p-2 sm:block dark:border-white/10">
              <div className="mb-1 flex items-center justify-between rounded-lg px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="text-[11px] font-medium">
                  {theme === "dark" ? "Tema escuro" : "Tema claro"}
                </span>
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  title={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
                  aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="group flex w-full items-center rounded-lg px-2 py-1.5 text-xs text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-red-500/80 group-hover:text-red-600 dark:group-hover:text-red-400" />
                  <span>{t.navbar?.logout || "Sair"}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#1d1d1b]">
          <div className="hidden items-center justify-between border-b border-neutral-200/80 px-5 py-3 sm:flex dark:border-white/10">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {SETTINGS_NAV.find((item) => item.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fechar configurações"
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto">{renderTabContent()}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function SettingsModal(props: SettingsModalProps) {
  return (
    <WorkspaceProvider>
      <ApiTokensProvider>
        <BackupProvider>
          <SlackProvider>
            <SettingsModalContent {...props} />
          </SlackProvider>
        </BackupProvider>
      </ApiTokensProvider>
    </WorkspaceProvider>
  );
}
