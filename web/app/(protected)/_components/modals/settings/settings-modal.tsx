"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { User, Lock, Zap, CreditCard, X, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";
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

export type SettingsTab = "account" | "plans" | "security" | "integrations";

type SettingsNavItem = {
  id: SettingsTab;
  icon: LucideIcon;
  label: string;
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
  const { t } = useLanguage();
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#settings/")) {
        const fullPath = hash.replace("#settings/", "");
        const tab = fullPath.split("/")[0];
        if (tab === "me") setActiveTab("account");
        else if (tab === "plan") setActiveTab("plans");
        else if (["account", "plans", "security", "integrations"].includes(tab)) {
          setActiveTab(tab as SettingsTab);
        }
      } else if (initialTab && hash === "#settings") {
        // If just #settings, replace with the initialTab (or account)
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#settings/${initialTab}`
        );
        setActiveTab(initialTab);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isOpen, initialTab]);

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
      },
      {
        id: "plans",
        icon: CreditCard,
        label: t.nav.plans || "Planos",
      },
      {
        id: "security",
        icon: Lock,
        label: t.nav.security || "Segurança",
      },
      {
        id: "integrations",
        icon: Zap,
        label: t.nav.integrations || "Integrações",
      },
    ],
    [t]
  );

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
      default:
        return <AccountSettingsTab />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all sm:flex-row dark:bg-[#1d1d1b] dark:ring-white/10">
        {/* Mobile Header (visible only on small screens) */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:hidden dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t.nav.settingsLabel || "Configurações"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col border-b border-gray-200 bg-gray-50/50 sm:w-64 sm:border-r sm:border-b-0 dark:border-gray-800 dark:bg-[#1d1d1b]/50">
          <div className="hidden p-4 sm:flex sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.nav.settingsLabel || "Configurações"}
            </h2>
          </div>

          <div className="flex flex-1 flex-row overflow-x-auto p-2 sm:flex-col sm:overflow-visible">
            <ul className="flex w-full flex-1 space-x-1 sm:flex-col sm:space-y-0.5 sm:space-x-0">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id} className="flex-shrink-0 sm:w-full">
                    <button
                      onClick={() => {
                        window.location.hash = `#settings/${item.id}`;
                      }}
                      className={`group flex w-full items-center rounded-md px-3 py-2 text-sm transition-all ${
                        isActive
                          ? "bg-amber-100/70 font-medium text-neutral-900 dark:bg-amber-500/10 dark:text-neutral-100"
                          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            isActive
                              ? "text-brand-primary-500"
                              : "text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto hidden border-t border-gray-200 pt-4 sm:block dark:border-gray-800">
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="group flex w-full items-center rounded-md px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 flex-shrink-0 text-red-500/70 group-hover:text-red-600 dark:group-hover:text-red-400" />
                  <span>{t.navbar?.logout || "Sair"}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#1d1d1b]">
          <div className="hidden sm:absolute sm:top-4 sm:right-4 sm:z-10 sm:block">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
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
