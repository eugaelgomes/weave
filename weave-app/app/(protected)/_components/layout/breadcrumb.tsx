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
  const orgPrefix = user?.org_public_id
    ? `/${user.org_public_id}`
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

  if (
    breadcrumbs.length === 0 ||
    (breadcrumbs.length === 1 && breadcrumbs[0].path === "/home")
  ) {
    return null;
  }

  return (
    <nav
      aria-label={t.nav.breadcrumbNav}
      className="mb-3 flex items-center gap-2 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 backdrop-blur-sm sm:mb-4 sm:px-4"
    >
      {/* Home Link */}
      <Link
        href={`${orgPrefix}/home`}
        className="group hover:text-brand-primary-500 flex items-center gap-1.5 rounded-md px-2 py-1 text-neutral-400 transition-all hover:bg-neutral-800/50"
        aria-label={t.nav.breadcrumbHome}
      >
        <Home className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
        <span className="hidden text-xs font-medium sm:inline">{t.nav.breadcrumbHome}</span>
      </Link>

      {/* Breadcrumb */}
      {breadcrumbs.map((crumb) => (
        <React.Fragment key={crumb.path}>
          {/* Separador > */}
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-600" />

          {/* Item */}
          {crumb.isLast ? (
            <span className="bg-brand-primary-500/10 text-brand-primary-500 truncate rounded-md px-2.5 py-1 text-xs font-semibold">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.path}
              className="truncate rounded-md px-2.5 py-1 text-xs font-medium text-neutral-400 transition-all hover:bg-neutral-800/50 hover:text-neutral-200"
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
