"use client";

import { useState } from "react";
import { submitOnboardingWorkspace } from "@/app/_services/user-onboarding";

interface Props {
  onNext: (workspaceId: string) => void;
}

export function Step2Workspace({ onNext }: Props) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [uniqueName, setUniqueName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await submitOnboardingWorkspace({
        workspace_name: workspaceName,
        unique_name: uniqueName,
      });
      onNext(result.data.workspaceId);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const generateUniqueName = (val: string) => {
    setWorkspaceName(val);
    setUniqueName(val.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
  };

  return (
    <div className="flex flex-col text-center">
      <h1 className="text-brand-secondary-900 mb-1.5 text-2xl font-bold tracking-tight">
        Crie seu Workspace
      </h1>
      <p className="text-brand-secondary-500 mb-6 text-sm leading-relaxed">
        O workspace é onde você e sua equipe trabalharão juntos.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <div className="space-y-1.5">
          <label className="text-brand-secondary-600 text-xs font-medium">Nome do Workspace</label>
          <input
            value={workspaceName}
            onChange={(e) => generateUniqueName(e.target.value)}
            required
            placeholder="Ex: Minha Empresa"
            className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-brand-secondary-600 text-xs font-medium">URL Única</label>
          <input
            value={uniqueName}
            onChange={(e) => setUniqueName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            required
            placeholder="minha-empresa"
            className="border-brand-secondary-200 text-brand-secondary-900 placeholder:text-brand-secondary-400 focus:ring-brand-primary-700 w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !workspaceName || !uniqueName}
          className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? "Criando..." : "Criar Workspace"}
        </button>
      </form>
    </div>
  );
}
