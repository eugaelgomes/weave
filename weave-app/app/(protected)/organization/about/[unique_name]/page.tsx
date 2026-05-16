"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../../../_contexts/auth-context";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";

const AboutOrg = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-50 dark:bg-[#1d1d1b]">
      <WorkspaceHeader />
      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/organization/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Sobre {user?.org_name ?? "a organização"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Esta área será expandida com detalhes do workspace. Por enquanto, use o painel e as
              configurações para gerenciar sua organização.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutOrg;
