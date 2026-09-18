"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { useAuth } from "@/app/_contexts/auth-context";

const Breadcrumb = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const workspacePrefix = user?.workspace_public_id
    ? `/${user.workspace_public_id}`
    : user?.public_id
      ? `/${user.public_id}`
      : "";

  // Função para formatar o label
  const formatLabel = (segment: string): string => {
    // Decodifica caracteres da URL
    const decoded = decodeURIComponent(segment);

    // Substitui hífens e underscores por espaços
    const withSpaces = decoded.replace(/[-_]/g, " ");

    // Capitaliza cada palavra
    return withSpaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Segmentos de URL
  const generateBreadcrumbs = () => {
    // Remover barras
    const segments = pathname.split("/").filter((segment) => segment !== "");

    if (segments.length === 0) {
      return [];
    }

    const breadcrumbs = segments.map((segment, index) => {
      const path = "/" + segments.slice(0, index + 1).join("/");
      const label = formatLabel(segment);
      const isLast = index === segments.length - 1;

      return {
        label,
        path,
        isLast,
      };
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0 || (breadcrumbs.length === 1 && breadcrumbs[0].path === "/home")) {
    return null;
  }

  return (
    <nav
      aria-label={t.nav.breadcrumbNav}
      className="mb-3 flex items-center gap-2 overflow-x-auto sm:mb-4"
    >
      {/* Home Link */}
      <Link
        href={`${workspacePrefix}/home`}
        className="group hover:text-brand-primary-500 dark:hover:text-brand-primary-500 flex items-center gap-1.5 text-neutral-500 transition-all dark:text-neutral-400"
        aria-label={t.nav.breadcrumbHome}
      >
        <Home className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
        <span className="hidden text-xs font-medium sm:inline">{t.nav.breadcrumbHome}</span>
      </Link>

      {/* Breadcrumb */}
      {breadcrumbs.map((crumb) => (
        <React.Fragment key={crumb.path}>
          {/* Separador > */}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-600" />

          {/* Item */}
          {crumb.isLast ? (
            <span className="text-brand-primary-600 dark:text-brand-primary-500 truncate text-xs font-semibold">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.path}
              className="truncate text-xs font-medium text-neutral-500 transition-all hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
