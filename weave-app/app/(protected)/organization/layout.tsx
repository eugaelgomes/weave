"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  CreditCard,
  Zap,
  Users,
  MessageSquare,
  Workflow,
  Network,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import {
  WorkspaceHeader,
  type WorkspaceHeaderType,
} from "../_components/ui/headers/workspace-header";
import { useLanguage } from "@/app/_contexts/language-context";
import { ModuleLayout } from "../_components/layout/module-layout";
import { OrganizationProvider } from "@/app/_contexts/organization-context";
import { SlackProvider } from "@/app/_contexts/slack-context";

type WorkspaceNavLeaf = {
  icon: LucideIcon;
  label: string;
  href: string;
  matchPaths?: string[];
  type: WorkspaceHeaderType;
};

type WorkspaceNavItem = WorkspaceNavLeaf & {
  subItems?: WorkspaceNavLeaf[];
};

function isStandaloneOrganizationPath(pathname: string): boolean {
  return (
    pathname.startsWith("/organization/create") || pathname.startsWith("/organization/dashboard")
  );
}

function collectPathMatchers(
  items: WorkspaceNavItem[]
): { prefix: string; leaf: WorkspaceNavLeaf }[] {
  const matchers: { prefix: string; leaf: WorkspaceNavLeaf }[] = [];

  for (const item of items) {
    if (item.subItems?.length) {
      for (const sub of item.subItems) {
        for (const prefix of [sub.href, ...(sub.matchPaths ?? [])]) {
          matchers.push({ prefix, leaf: sub });
        }
      }
    } else {
      for (const prefix of [item.href, ...(item.matchPaths ?? [])]) {
        matchers.push({ prefix, leaf: item });
      }
    }
  }

  return matchers;
}

const linkClass = (isActive: boolean) =>
  `group flex w-full items-center rounded-md px-2 py-1.5 text-xs transition-all ${
    isActive
      ? "bg-amber-100/70 font-medium text-neutral-900 dark:bg-amber-500/10 dark:text-neutral-100"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
  }`;

const iconClass = (isActive: boolean) =>
  `h-3.5 w-3.5 flex-shrink-0 ${
    isActive
      ? "text-brand-primary-500"
      : "text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300"
  }`;

function WorkspaceNavLink({
  item,
  isActive,
  indent = false,
}: {
  item: WorkspaceNavLeaf;
  isActive: boolean;
  indent?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`${linkClass(isActive)} ${indent ? "pl-3" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={iconClass(isActive)} />
        <span>{item.label}</span>
      </div>
    </Link>
  );
}

function OrganizationLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const WORKSPACE_NAV: WorkspaceNavItem[] = useMemo(
    () => [
      {
        icon: Settings,
        label: t.nav.general,
        href: "/organization/general",
        type: "workspaceSettings",
      },
      {
        icon: CreditCard,
        label: t.nav.plans,
        href: "/organization/plans",
        type: "workspacePlans",
      },
      {
        icon: Zap,
        label: t.nav.integrations,
        href: "/organization/integrations",
        type: "workspaceIntegrations",
      },
      {
        icon: Users,
        label: t.nav.members,
        href: "/organization/members/list",
        type: "workspaceMembers",
        subItems: [
          {
            icon: Users,
            label: t.nav.list,
            href: "/organization/members/list",
            type: "workspaceMembers",
          },
          {
            icon: MessageSquare,
            label: t.nav.invites,
            href: "/organization/members/invites",
            type: "workspaceInvites",
          },
        ],
      },
      {
        icon: Workflow,
        label: t.nav.areas,
        href: "/organization/areas",
        type: "workspaceAreas",
      },
      {
        icon: Network,
        label: t.nav.projects,
        href: "/organization/projects",
        type: "workspaceProjects",
      },
      {
        icon: PenLine,
        label: t.nav.editor,
        href: "/organization/editor",
        matchPaths: ["/organization/about"],
        type: "workspaceEditor",
      },
    ],
    [t]
  );

  const activeLeaf = useMemo(() => {
    const matchers = collectPathMatchers(WORKSPACE_NAV);
    matchers.sort((a, b) => b.prefix.length - a.prefix.length);
    for (const { prefix, leaf } of matchers) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return leaf;
    }
    return WORKSPACE_NAV[0];
  }, [pathname, WORKSPACE_NAV]);

  const isLeafActive = (leaf: WorkspaceNavLeaf) => {
    const prefixes = [leaf.href, ...(leaf.matchPaths ?? [])];
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  const isGroupActive = (item: WorkspaceNavItem) =>
    item.subItems?.some((sub) => isLeafActive(sub)) ?? false;

  const sidebarContent = (
    <div className="p-2">
      <h2 className="mb-3 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        {t.nav.workspace}
      </h2>

      <ul className="space-y-0.5">
        {WORKSPACE_NAV.map((item) => {
          const hasSubItems = !!item.subItems?.length;

          if (!hasSubItems) {
            const isActive = isLeafActive(item);
            return (
              <li key={item.href}>
                <WorkspaceNavLink item={item} isActive={isActive} />
              </li>
            );
          }

          const groupActive = isGroupActive(item);
          const ParentIcon = item.icon;

          return (
            <li key={item.label} className="space-y-0.5">
              <div
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-xs ${
                  groupActive
                    ? "font-medium text-neutral-800 dark:text-neutral-200"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ParentIcon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      groupActive ? "text-brand-primary-500" : "text-neutral-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </div>

              <ul className="dark:border-surface-dark-border-muted ml-2 space-y-0.5 border-l border-neutral-200 pl-1 dark:border-neutral-700">
                {item.subItems!.map((sub) => (
                  <li key={sub.href}>
                    <WorkspaceNavLink item={sub} isActive={isLeafActive(sub)} indent />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <ModuleLayout
      header={<WorkspaceHeader type={activeLeaf.type} />}
      sidebarContent={sidebarContent}
    >
      {children}
    </ModuleLayout>
  );
}

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isStandaloneOrganizationPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <OrganizationProvider>
      <SlackProvider>
        <OrganizationLayoutContent>{children}</OrganizationLayoutContent>
      </SlackProvider>
    </OrganizationProvider>
  );
}
