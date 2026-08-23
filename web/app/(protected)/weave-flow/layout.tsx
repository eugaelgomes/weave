"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waypoints } from "lucide-react";
import { ModuleLayout } from "@/app/(protected)/_components/layout/module-layout";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";

import { WeaveFlowHeader } from "@/app/(protected)/_components/ui/headers/weave-flow-header";

export default function WeaveFlowLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="p-2">
      <SidebarSectionHeader title="Weave Flow" />
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/weave-flow"
            className={`group flex w-full items-center rounded-md px-2 py-1.5 text-xs transition-all ${
              pathname === "/weave-flow"
                ? "bg-amber-100/70 font-medium text-neutral-900 dark:bg-amber-500/10 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Waypoints
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  pathname === "/weave-flow"
                    ? "text-brand-primary-500"
                    : "text-neutral-400 group-hover:text-neutral-500"
                }`}
              />
              <span>Canvas</span>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );

  return <ModuleLayout header={<WeaveFlowHeader />}>{children}</ModuleLayout>;
}
