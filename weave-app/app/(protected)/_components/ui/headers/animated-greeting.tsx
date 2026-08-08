"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";

const getFirstAndLastUserName = (fullName: string): string => {
  const names = fullName.trim().split(/\s+/);
  const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  if (names.length === 1) {
    return capitalize(names[0]);
  }

  const firstName = capitalize(names[0]);
  const lastName = capitalize(names[names.length - 1]);

  return `${firstName} ${lastName}`;
};

interface AnimatedGreetingProps {
  type?:
    | "home"
    | "projects"
    | "notes"
    | "settings"
    | "calendar"
    | "notifications"
    | "weave-ai"
    | "workspace"
    | "workspaceSettings"
    | "workspaceMembers"
    | "workspaceInvites"
    | "workspaceAreas"
    | "workspaceProjects"
    | "workspacePlans"
    | "workspaceIntegrations"
    | "workspaceEditor"
    | "plans"
    | "security"
    | "integrations"
    | "preferences"
    | "documents"
    | "weave-flow";
}

export function AnimatedGreeting({ type = "home" }: AnimatedGreetingProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const userName = String(user?.user_name || user?.username || t.common.user);
  const formattedName = getFirstAndLastUserName(userName);

  const getGreeting = () => {
    switch (type) {
      case "home":
        return (
          <span className="text-brand-primary-500 font-semibold">
            {t.greeting.hello} {formattedName}
          </span>
        );
      case "projects":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.projects}</span>;
      case "notes":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.notes}</span>;
      case "calendar":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.calendar}</span>;
      case "notifications":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.notifications}</span>;
      case "settings":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.settings}</span>;
      case "workspace":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.workspace}</span>;
      case "workspaceSettings":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.general}</span>;
      case "workspaceMembers":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.members}</span>;
      case "workspaceInvites":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.invites}</span>;
      case "workspaceAreas":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.areas}</span>;
      case "workspaceProjects":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.projects}</span>;
      case "workspacePlans":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.plans}</span>;
      case "workspaceIntegrations":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.integrations}</span>;
      case "workspaceEditor":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.editor}</span>;
      case "plans":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.plans}</span>;
      case "security":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.security}</span>;
      case "integrations":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.integrations}</span>;
      case "preferences":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.preferences}</span>;
      case "documents":
        return <span className="text-brand-primary-500 font-semibold">{t.nav.documents}</span>;
      case "weave-ai":
        return (
          <span className="from-brand-primary-500 bg-linear-to-r to-purple-600 bg-clip-text font-bold text-transparent">
            {t.nav.weaveAi}
          </span>
        );
      case "weave-flow":
        return (
          <span className="from-brand-primary-500 bg-linear-to-r to-cyan-500 bg-clip-text font-bold text-transparent">
            {t.nav.weaveFlow}
          </span>
        );
      default:
        return (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {t.greeting.hello} {formattedName}
          </span>
        );
    }
  };

  const getMessage = () => {
    switch (type) {
      case "home":
        return t.headers.home;
      case "projects":
        return t.headers.projects;
      case "notes":
        return t.headers.notes;
      case "calendar":
        return t.headers.calendar;
      case "notifications":
        return t.headers.notifications;
      case "settings":
        return t.headers.settings;
      case "workspace":
        return t.headers.workspace;
      case "workspaceSettings":
        return t.headers.workspace;
      case "workspaceMembers":
        return t.headers.workspaceMembers;
      case "workspaceInvites":
        return t.headers.workspaceInvites;
      case "workspaceAreas":
        return t.headers.workspaceAreas;
      case "workspaceProjects":
        return t.headers.workspaceProjects;
      case "workspacePlans":
        return t.headers.workspacePlans;
      case "workspaceIntegrations":
        return t.headers.workspaceIntegrations;
      case "workspaceEditor":
        return t.headers.workspaceEditor;
      case "plans":
        return t.headers.plans;
      case "security":
        return t.headers.security;
      case "integrations":
        return t.headers.integrations;
      case "preferences":
        return t.headers.preferences;
      case "documents":
        return t.headers.documents;
      case "weave-ai":
        return t.headers.weaveAi;
      case "weave-flow":
        return "— seu fluxo de valor";
      default:
        return "";
    }
  };

  return (
    <div className="flex items-center text-xs tracking-tight">
      <div
        className={cn(
          "transform transition-all duration-700 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        {getGreeting()}
      </div>
      <div
        className={cn(
          "ml-1 transform font-normal text-gray-500 transition-all delay-300 duration-1000 ease-out dark:text-gray-400",
          isVisible ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
        )}
      >
        {getMessage()}
      </div>
    </div>
  );
}
